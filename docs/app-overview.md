# App overview — PrivOS Demo MCP App

`ai.privos.mcp-app-demo` (see [`privos-app.json`](../privos-app.json)) is the reference
schema-v2 PrivOS MCP app. It exists to demonstrate the full app-platform contract end to
end — permissions, safe degradation, secretless workload identity, authenticated private
Hub dispatch, the iframe host bridge, license-aware behavior, and reproducible Marketplace
packaging — not to be a real HR product. See the repo [`README.md`](../README.md) for the
full runtime-mode and deployment story; this doc is the concise map of what's in the UI.

## UI surfaces (tabs / panels)

Each tab is one component under `src/ui/`, backed by a permission declared in
`privos-app.json` (see [`SCOPES.md`](../SCOPES.md) for the exact call-site map).

| Panel | File | Demonstrates |
|---|---|---|
| Backend-verified identity | `src/ui/whoami-panel.tsx` | `hr_whoami` — Hub-signed actor verified server-side, contrasted with untrusted client-claimed context |
| Agent bot | `src/ui/agent-bot-panel.tsx` | Installation-owned bot identity: workspace approval creates the bot, separate Room approvals join it |
| Isolated ASSIGNEE list | `src/ui/assignee-demo-panel.tsx` | Isolated list + `ASSIGNEE` custom field, multi-user assignment, per-item visibility |
| Custom permissions | `src/ui/custom-permissions-panel.tsx` | Per-record read/write ACLs on an isolated list via room custom-permission grants |
| Notification | `src/ui/notification-panel.tsx` | `mcpapp.notifications.create` — room-scoped bell + push notification |
| Attempt lifecycle | `src/ui/attempt-lifecycle-panel.tsx` (+ `attempt-observation-section.tsx`) | `agents.sandbox.generate-async` / `attempt-observation` / `attempt-cancel`, idempotent `operationId` |
| Attempt evidence | `src/ui/attempt-evidence-panel.tsx` | `agents.sandbox.attempt-evidence` — recorded LLM/gateway calls for one attempt |
| App Objects (CAS) | `src/ui/app-objects-panel.tsx` | Content-addressed object store via this app's own bot credential (`app-objects-demo-tool.ts`) |
| App Database | `src/ui/app-db-panel.tsx` | Room-scoped app-owned collection via bot credential (`app-db-demo-tool.ts`) |
| Theme inheritance | `src/ui/theme-inheritance-panel.tsx` | Live workspace theme sync via the 12 curated `--base-*` tokens — see [`theming-guide.md`](./theming-guide.md) |
| File upload | `src/ui/file-upload-panel.tsx` | File attach/list flow |
| AI Poem | `src/ui/ai-poem-panel.tsx` | AI-generated content into editable form fields |
| License | `src/ui/license-panel.tsx` | Free/Pro tier gating, `license.assert` / `assertWithin` degraded behavior |
| Skills | `src/ui/skills-panel.tsx` | Agent skill/tool listing |
| Sandbox connect | `src/ui/sandbox-connect-panel.tsx` | Sandbox connection flow |
| Info | `src/ui/info-panel.tsx` | Environment configuration echo (`HRM_*` vars, platform context) |
| App-owned chat surface | `src/ui/app-owned-chat-panel.tsx` | Claiming the Hub's floating chat launcher for the app's own overlay |

Additional lazily-loaded chat/history/storage components live under `src/ui/panels/`
(`ai-chat-panel.tsx`, `ai-history-panel.tsx`, `bot-workload-panel.tsx`, `embeds-panel.tsx`,
`storage-panel.tsx`, `agent-set-upload-panel.tsx`) and are mounted from the tabs above.

## Backend tools

Declared in `privos-app.json`, implemented under `src/`:

- `hr_whoami` — returns the Hub-verified actor (backend `src/mcp-message-handlers.ts`).
- `hr_management_dashboard` — the license-gated demo record dashboard.
- `hr_bulk_export` — Pro-tier-only bulk export (`license.assert('bulk-export')`).
- `hr_agent_bot_credential_check` — validates the reserved bot-credential env pair
  (`src/agent-bot-credential-check.ts`).
- `hr_app_object_store` — App Objects (CAS) demo tool (`src/app-objects-demo-tool.ts`),
  calls `mcpapp.objects.put/.head/.get` via this app's own bot credential
  (`src/app-platform-tool-call.ts`).
- `hr_app_db_store` — App Database demo tool (`src/app-db-demo-tool.ts`), calls
  `mcpapp.db.registerCollection/.create/.query/.getSchema` the same way.

`src/app-platform-demo-tool-defs.ts` holds the shared tool-definition schemas for the two
bot-credential tools above.

## Run

From `package.json`:

```bash
npm ci                  # install (use `npm ci --include=dev` if NODE_ENV=production
                         # is set in the shell — devDependencies include react/vite/vitest)
npm run dev              # local dev: relay transport + live Vite UI (localhost:5179)
npm run build             # vite build + manifest generation + manifest:lint
npm run typecheck         # tsc --noEmit
npm test                  # vitest run
npm run pair              # standalone production: pair against a self-hosted Hub (run twice)
npm start                 # managed / standalone runtime entrypoint
npm run start:standalone  # standalone production start (after pairing)
npm run preflight         # schema v2, canonical hashes, call-site docs, Docker inputs, license guards
npm run package           # deterministic tracked-source archive for Marketplace review
```

See the [README](../README.md) for the three runtime modes (`managed`,
`standalone-production`, `development`) and full pairing/deployment detail.

## Where theming lives

The app inherits the host workspace's light/dark mode and 12 curated `--base-*` design
tokens automatically via `@privos_ai/app-react`'s `PrivosAppProvider`. The app's own CSS
token layer (`src/ui/contact-form-styles.css`) maps every themeable value to
`var(--base-*, <fallback>)`; components consume that layer, never raw hex. Full mechanism,
the worked example, and common mistakes: [`docs/theming-guide.md`](./theming-guide.md).
