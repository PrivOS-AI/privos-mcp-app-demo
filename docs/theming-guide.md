# Theming a PrivOS MCP app correctly

Audience: developers building/maintaining a PrivOS MCP app UI. Explains the host theme
inheritance mechanism and the correct pattern to consume it — so an app visually matches
its host workspace without ever hardcoding a workspace's colours.

## Mechanism

1. The Hub knows the current workspace's light/dark mode and a curated set of design
   tokens (colours, radius, font). On load and on every theme change (mode flip, or a
   live admin theme save), it pushes both over the same non-secret `HOST_CONTEXT_CHANGED`
   postMessage bridge push that also carries `theme`/`roomId` to the app iframe.
2. `@privos_ai/app-react`'s `PrivosAppProvider` (`^0.6.0`) receives that push and calls
   `applyThemeTokens` internally: it writes every token onto the iframe document's
   `<html>` as a real CSS custom property, and keeps the `data-theme` attribute in sync
   with the host's light/dark mode — **before any app code runs**.
3. From then on, any CSS in the app that references `var(--base-*)` restyles live,
   automatically, with zero app-side event handling, whenever the workspace theme
   changes.

The app never reads the Hub's own stylesheet (it's a cross-origin iframe) — this
postMessage + CSS-custom-property bridge is the only channel.

## The curated 12 tokens

| Token | Meaning |
|---|---|
| `--base-primary` | Primary action colour |
| `--base-primary-hover` | Primary action colour, hover state |
| `--base-bg-main` | Main page background |
| `--base-bg-menu` | Menu / sidebar background |
| `--base-bg-surface` | Card / surface background |
| `--base-bg-header` | Header / table-head background |
| `--base-border` | Border colour |
| `--base-text-primary` | Primary text colour |
| `--base-text-secondary` | Secondary text colour |
| `--base-info` | Link / info colour |
| `--base-radius-md` | Corner radius |
| `--base-font-family` | Font family |

This is the full curated set. There is no `--base-success`, `--base-error`,
`--base-danger`, or similar — status colours and overlay tints are intentionally not
part of the host contract (see "Common mistakes" below).

## The correct pattern

Define your **own token layer** in CSS that maps each app variable to
`var(--base-*, <fallback>)`, where `<fallback>` is the app's own standalone palette:

```css
:root, [data-theme="light"] {
  --bg-card: var(--base-bg-surface, #FFFFFF);
  --text: var(--base-text-primary, #1F2329);
  --border: var(--base-border, #E4E7EA);
  --accent: var(--base-primary, #156FF5);
}
[data-theme="dark"] {
  --bg-card: var(--base-bg-surface, #131a1e);
  --text: var(--base-text-primary, #E4E7EA);
  /* ... */
}
```

Components then consume **only the app token layer** (`var(--bg-card)`,
`var(--text)`, ...) — never `var(--base-*)` directly (except in a component that is
deliberately demonstrating the raw host contract, see below) and never a raw hex value.

Two rules make this durable:

- **Always keep the fallback.** The app must render correctly standalone (outside any
  PrivOS workspace) or before the first `HOST_CONTEXT_CHANGED` arrives. The fallback is
  what makes that true — it is not optional scaffolding to delete later.
- **Never hardcode a specific workspace's colour.** A literal hex value copied from one
  workspace's theme (its `#f0e8d6` background, its `#b03c3e` accent, etc.) breaks every
  other workspace this same published app is installed into. If a token has no curated
  `--base-*` equivalent (status colours, overlay tints), keep it a literal *neutral*
  design choice — not a value sampled from a specific workspace — and say so in a
  comment.

## Worked example in this repo

- [`src/ui/contact-form-styles.css`](../src/ui/contact-form-styles.css) — the `:root`,
  `[data-theme="light"]`, and `[data-theme="dark"]` blocks (near the top of the file)
  are the app's token layer. Every themeable token maps to a `--base-*` var with a
  fallback; every component in this app's CSS then consumes `--bg`, `--text`,
  `--border`, `--accent`, etc. Status colours (`--success-bg`, `--error-text`,
  `--danger`, `--overlay`, `--bg-editing`) are literal by design and commented as such —
  the curated set has no equivalent.
- [`src/ui/theme-inheritance-panel.tsx`](../src/ui/theme-inheritance-panel.tsx) — the one
  deliberate exception: this panel exists specifically to *prove the raw host contract
  works*, so its sample UI references `var(--base-*)` directly instead of going through
  the app's own token indirection. Every other component in the app should NOT do this —
  go through the app token layer instead.
- [`src/ui/whoami-panel.tsx`](../src/ui/whoami-panel.tsx) — inline-style `box()`/`badge()`
  helpers take `var(--token)` strings (e.g. `var(--success-text)`, `var(--error-bg)`)
  rather than hex, so even ad hoc inline styles stay on the token layer.

## Common mistakes

- **Hardcoding a workspace's hex value.** A colour that happens to look right in the
  workspace you tested against is wrong everywhere else the app is installed. Map to a
  `--base-*` token (with a neutral fallback) or, if none fits, use a literal neutral
  value and say why in a comment.
- **Missing the fallback.** `var(--base-primary)` with no second argument renders as
  unset/transparent when standalone or before the first host context — always supply a
  fallback.
- **Inventing a `--base-*` token that isn't in the curated 12.** The Hub only ever
  broadcasts the 12 tokens listed above; anything else you reference under that prefix
  will simply never resolve. If you need something the curated set doesn't cover
  (status colours, an overlay tint), that's a signal to keep it a literal app-level
  design decision, not to guess at an uncurated host token name.
