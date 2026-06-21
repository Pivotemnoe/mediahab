# UI Phase 10t — Guided Queue Contract Extraction

## Objective

Extract the guided-form local queue browser contract from the Content Studio component into a small client-safe module so the app shell, guided form, and future service-worker/background-sync layer can share the same prefix and event names without importing heavy UI code.

## Non-Goals

- Do not implement service-worker background sync, automatic queue replay, merge tooling, live recording, STT upload, media upload, AI assembly, or publication approval.
- Do not change backend routes, database schema, migrations, provider settings, or generated OpenAPI.
- Do not enable fixture mutations.
- Do not change local queue payload semantics.

## Current-State Findings

- UI Phase 10s made `OfflineStatus` import `guidedFormQueuePrefix` and `guidedFormQueueEvent` from `guided-form-actions.tsx`.
- That import couples the app shell to the full Content Studio client component and can inflate shared client bundles.
- The public service worker currently has no import/bundling pipeline, so constants for future service-worker replay should live in frontend source first and be mirrored deliberately later.

## Assumptions And Open Questions

- A small source module under `apps/web/src/services/` is the right location for browser-local queue contract constants.
- The contract should include prefix, same-tab event name, and helper functions for key creation and key matching.
- Queue payload shape remains private to the current client component for now; future replay can formalize it when service worker support is added.

## Files And Modules

- Add `apps/web/src/services/guided-queue-contract.ts`.
- Update `apps/web/src/components/phase04/guided-form-actions.tsx` to import queue prefix/event/key helper.
- Update `apps/web/src/components/pwa/offline-status.tsx` to import queue helpers from the contract module.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting frontend refactor/docs changes.

## Security And Tenancy Impact

No storage payloads change. The app shell still reads only localStorage keys and counts jobs; it does not expose queued field text or auth material.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent. No live backend is required.

## Implementation Order

1. Add contract module with queue prefix, event name, key helper, and matcher.
2. Replace direct constants in guided-form actions.
3. Replace app-shell imports and counting logic.
4. Run typecheck, lint, web build, visual smoke, spec validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- App shell no longer imports queue constants from `guided-form-actions.tsx`.
- Guided-form queue keys still use the same prefix.
- Shell queue count smoke still passes without leaking queued content.
- No backend schema, migration, OpenAPI, AI, STT, S3, or social connector behavior changes.

## Risks And Recovery

- If future service-worker replay needs the same constants, the public `sw.js` build pipeline must be addressed separately because it currently is a static file.

## Status

- 2026-06-21: Started after UI Phase 10s.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
