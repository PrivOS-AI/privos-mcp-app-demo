# Displaying and downloading Hub file binaries

Audience: developers building a PrivOS MCP app that needs to show an image or play
audio/video stored in Hub **Files**, or let a user download such a file. Covers the
two contexts — inside the app iframe, and on a public page the app serves itself.

The authoritative reference is
[`privos-dev-docs/file-management/serving-file-binaries-in-apps.md`](https://github.com/PrivOS-AI/privos-dev-docs/blob/main/file-management/serving-file-binaries-in-apps.md);
this guide is the copy-paste version.

## Why the obvious paths don't work

A file's bytes live in the Hub object store (MinIO). From a browser:

- `file.downloadUrl` (from `GET /file-management.files/:id`) is a presigned URL to the
  Hub's **internal** MinIO host (e.g. `http://10.88.0.13:9000/...`) — unreachable from a
  user's browser.
- `GET /file-management.files/:id/download` needs an auth token; the app iframe is an
  **opaque origin** with no token/cookie.
- Pulling bytes through `app.rest()` **corrupts binary** — the REST proxy reads the
  response as text. (It is fine for JSON/text like `transcript.json`, `.srt`, `.md`.)

## The endpoint that works

The Hub serves an **unauthenticated inline route** from its **web origin**:

```
GET /api/v1/file-management.files/:fileId/content/:filename
```

- `authRequired: false` — guarded by the unguessable 24-hex ObjectId.
- `:filename` is cosmetic and ignored (`Content-Type` comes from the stored file); pass
  any placeholder like `content/image`. **Always keep the filename segment** — the
  no-filename variant requires auth.
- An `<img>` / `<audio>` / `<a download>` can load it cross-origin, no auth.

---

## Case A — Inside the app iframe (client)

The iframe is not told the Hub's public URL, so recover the parent origin from
`ancestorOrigins` (fallback `referrer`). Drop this helper in your UI:

```ts
// src/ui/data/hub-file-url.ts
export function hubOrigin(): string | null {
  try {
    const a = window.location.ancestorOrigins;
    if (a && a.length > 0 && a[0]) return a[0];
  } catch { /* unavailable in some engines */ }
  try {
    if (document.referrer) return new URL(document.referrer).origin;
  } catch { /* malformed/absent */ }
  return null;
}

/** Browser-loadable URL for a Hub fileId, or null when standalone / empty id. */
export function hubFileContentUrl(fileId: string | undefined | null): string | null {
  const id = typeof fileId === 'string' ? fileId.trim() : '';
  if (!id) return null;
  const origin = hubOrigin();
  if (!origin) return null;
  return `${origin}/api/v1/file-management.files/${encodeURIComponent(id)}/content/image`;
}
```

```tsx
const url = hubFileContentUrl(fileId);
{url ? <img src={url} alt="" loading="lazy" /> : <InitialsPlaceholder />}
{url ? <audio controls src={url} /> : null}
{url ? <a href={url} download={fileName}>Download</a> : null}
```

`null` means "opened standalone / origin unknown" — render a placeholder.

**CSP gotcha for `<audio>`/`<video>`:** if your app declares a `ui.csp` block (for
example to allow a `connect-src` WebSocket), every directive you list is enforced as-is
— it no longer falls back to the Hub's permissive baseline. So if you declare
`media-src`, it must include the Hub web origin or audio/video is blocked. `<img>` is
only affected if you declare `img-src`. Editing the manifest CSP causes a one-time
`MANIFEST_DRIFT` → clear it with **Hub Admin → Apps → Refresh + approve** (no re-pair).

---

## Case B — On a public page your app serves (server)

A public HTML page has no parent origin to scrape, and server code isn't told the Hub's
browser-facing host. Serve the bytes from **your own origin** and stream them from the
Hub as the installation bot:

```ts
const OBJECT_ID_RE = /^[a-f0-9]{24}$/; // block path injection

app.get('/public/media/:fileId', async (req, res) => {
  const fileId = String(req.params.fileId ?? '');
  if (!OBJECT_ID_RE.test(fileId)) return void res.status(404).end();

  const upstream = await agentBotAuthorizedFetch(
    `/api/v1/file-management.files/${fileId}/content/image`,
    { method: 'GET', requiredScope: 'basic:information' }, // route is authRequired:false
  );
  if (!upstream.ok) return void res.status(404).end();

  const ct = upstream.headers.get('content-type') ?? 'application/octet-stream';
  if (!ct.startsWith('image/')) return void res.status(404).end(); // allowlist output
  res.setHeader('Content-Type', ct);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.end(Buffer.from(await upstream.arrayBuffer())); // arrayBuffer, never .text()
});
```

Then embed the **same-origin** URL (`/public/media/<fileId>`) in your HTML. Notes:

- `basic:information` scope is enough (the content route is `authRequired: false`), so
  installs without `files:read` still serve media — but still go through the bot fetch.
- Validate the ObjectId before building the path; allowlist the output `Content-Type`.
- Return **404** (not 500) when the bot channel isn't ready or upstream fails.

---

## Quick decision

| You are… | Use |
|----------|-----|
| Showing/downloading a binary **in the app iframe** | Case A |
| Rendering a binary on a **public page your server serves** | Case B |
| Reading a **JSON/text** artifact | `app.rest(GET .../download)` → parsed body |
| Fetching a large binary **server-side** (transcode/concat) | authenticated `.../download` as the bot, streamed |
