# UI Phase 10y — Service Worker Capabilities

## Objective

Add an explicit service-worker capability manifest and local consistency check so the PWA runtime can distinguish the current shell-cache worker from future mutation replay/background-sync support without making a false production claim.

## Non-Goals

- Do not implement automatic guided-form replay, Background Sync, or service-worker mutations.
- Do not call backend APIs from `sw.js`.
- Do not change backend routes, database schema, migrations, OpenAPI, or generated API clients.
- Do not enable fixture mutations.
- Do not store cookies, CSRF tokens, bearer tokens, connector credentials, or platform secrets in browser storage or service-worker cache.

## Current-State Findings

- `apps/web/public/sw.js` is a static GET shell cache worker.
- UI Phase 10w/10x added guided queue replay readiness and deterministic checks, but service-worker capability is still implicit in code and docs.
- `PwaRuntime` registers `/sw.js` in production but does not expose what the worker can or cannot do.
- Future replay work needs a stable guardrail: mutation replay must not be marked available unless `sw.js`, runtime policy, and API/CSRF prerequisites agree.

## Assumptions And Open Questions

- A public JSON manifest is acceptable for non-sensitive capability metadata.
- The manifest should be conservative: `mutationReplay=false`, `backgroundSync=false`, and shell cache only.
- The runtime may record capability metadata in `document.documentElement.dataset` for smoke/debug surfaces, but should not render new visible copy in this slice.
- Real mutation replay requires a later authenticated API-mode plan with HttpOnly cookie/CSRF strategy and version-conflict handling.

## Files And Modules

- Add `apps/web/public/sw-capabilities.json`.
- Update `apps/web/src/components/pwa/pwa-runtime.tsx` to load capabilities and expose dataset flags.
- Add `tools/check_sw_capabilities.mjs`.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is deleting the manifest/check and reverting the PWA runtime change.

## Security And Tenancy Impact

No server-side tenancy behavior changes. This slice makes the absence of background mutation replay explicit and keeps all mutation/auth material out of service-worker cache.

## External API And Live-Test Prerequisites

No external API or live backend is required.

## Implementation Order

1. Add conservative public service-worker capability manifest.
2. Update PWA runtime to fetch the manifest and set non-sensitive dataset flags.
3. Add local check that verifies manifest values match the current static `sw.js` behavior.
4. Run deterministic checks, typecheck, lint, build, visual smoke, spec validation, and diff checks.

## Tests And Commands

- `node tools/check_sw_capabilities.mjs`
- `node tools/check_guided_queue_replay.mjs`
- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Public manifest states shell-cache service worker version and explicitly disables mutation replay/background sync.
- `PwaRuntime` loads the manifest without blocking app rendering and exposes debug-safe dataset flags.
- Check script fails if manifest claims mutation replay/background sync while static `sw.js` has no corresponding safe implementation.
- `sw.js` still returns early for non-GET requests and does not register sync/background-sync handlers.

## Risks And Recovery

- Risk: manifest and worker drift. Mitigation: `tools/check_sw_capabilities.mjs` checks both together.
- Risk: runtime fetch failure could add noise. Mitigation: runtime records `dataset.serviceWorkerCapabilities="unavailable"` and does not surface an error to users.

## Status

- 2026-06-21: Started after UI Phase 10x.
- 2026-06-21: Implemented; service-worker capability check, guided queue replay check, typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
