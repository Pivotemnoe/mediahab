# UI Phase 10v — Guided Queue Store Boundary

## Objective

Move browser-local guided-form queue storage operations behind a shared client-safe store module so Content Studio, the app-shell offline status, and future service-worker/background replay use the same validated queue entries instead of ad hoc `localStorage` access.

## Non-Goals

- Do not implement automatic service-worker replay or Background Sync.
- Do not call backend APIs from the queue store.
- Do not change backend routes, database schema, migrations, OpenAPI, or generated API clients.
- Do not enable fixture mutations.
- Do not change queue key prefix, event name, or user-visible queue copy except where invalid queue entries stop counting as real jobs.
- Do not add live STT, recording upload, media upload, AI assembly, or publication approval.

## Current-State Findings

- UI Phase 10u formalized `GuidedQueueJob` DTO parsing/serialization in `guided-queue-contract.ts`.
- `guided-form-actions.tsx` still owns browser storage read/write/clear wrappers.
- `OfflineStatus` still counts all keys matching the guided queue prefix, so malformed or empty queue payloads can produce a misleading unsynced-fields banner.
- Future replay needs a stable way to enumerate valid queue entries with keys and parsed jobs.

## Assumptions And Open Questions

- A small `apps/web/src/services/guided-queue-store.ts` client-safe module is the right boundary for browser storage operations.
- The store should return only valid parsed jobs with non-empty values when listing/counting queue entries.
- The store should keep same-tab updates by dispatching the existing queue-change event after write/clear.
- Static `public/sw.js` still cannot import this source module. A later slice must decide bundling/mirroring before real service-worker replay.

## Files And Modules

- Add `apps/web/src/services/guided-queue-store.ts`.
- Update `apps/web/src/components/phase04/guided-form-actions.tsx` to use store helpers.
- Update `apps/web/src/components/pwa/offline-status.tsx` to count validated queue entries through the store.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting the frontend refactor and documentation files.

## Security And Tenancy Impact

No server-side tenancy behavior changes. Browser-local queue data still contains only field values plus action recovery metadata; tokens, cookies, credentials, and secrets are not stored. The app shell continues to display only aggregate counts, not queued field text.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent. Live API-mode autosave/conflict/retry testing and real replay require authenticated backend state and CSRF strategy.

## Implementation Order

1. Add queue store helpers for read/write/clear/list/count.
2. Replace component-local queue storage wrappers with store imports.
3. Replace app-shell raw key counting with validated queue count.
4. Add Russian report and run the standard checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Content Studio no longer owns queue `localStorage` wrappers.
- `OfflineStatus` counts only parsed queue jobs with non-empty values.
- Store exposes valid entries with both storage key and parsed job for future replay.
- Fixture visual smoke still shows status slots, fixture mutation controls remain disabled, and there is no horizontal overflow.

## Risks And Recovery

- Risk: old malformed queue entries may stop surfacing in the app-shell banner. This is intended; malformed entries cannot be replayed safely. A later cleanup UI can remove corrupt entries if needed.
- Risk: future service-worker replay still cannot import source modules directly. This slice creates the source contract only; service-worker bundling remains separate.

## Status

- 2026-06-21: Started after UI Phase 10u.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
