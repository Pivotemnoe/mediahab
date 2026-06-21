# UI Phase 10u — Guided Queue Payload DTO

## Objective

Formalize the browser-local guided-form queue payload in a small typed service module so the current Content Studio queue UI and future service-worker/background-sync replay share the same DTO parsing and serialization rules.

## Non-Goals

- Do not implement service-worker background sync or automatic replay.
- Do not change backend routes, database schema, migrations, provider settings, OpenAPI, or generated API clients.
- Do not enable fixture mutations.
- Do not change the visible queue behavior or localStorage key prefix.
- Do not add live STT, recording upload, media upload, AI assembly, or publication approval.

## Current-State Findings

- UI Phase 10t extracted guided queue keys and event names into `apps/web/src/services/guided-queue-contract.ts`.
- The queue payload shape still lives inside `guided-form-actions.tsx` as a private `QueueJob` interface and local parser.
- Future background-sync replay needs a stable DTO boundary before code can safely move out of the form component.

## Assumptions And Open Questions

- A client-safe service module under `apps/web/src/services/` remains the correct place for browser queue contract helpers.
- The payload must keep only user-entered form values plus error/recovery metadata; it must not store auth tokens, cookies, or backend secrets.
- Empty/whitespace-only queue values should remove the local queue entry, matching the current browser behavior.
- Public `sw.js` is still static; if replay is implemented later, it will need an explicit build/import strategy.

## Files And Modules

- Update `apps/web/src/services/guided-queue-contract.ts` with:
  - exported `GuidedQueueJob` DTO;
  - parse/serialize helpers;
  - queue-value presence helper;
  - queue-job creation helper with injectable timestamp for tests/future callers.
- Update `apps/web/src/components/phase04/guided-form-actions.tsx` to use the shared DTO helpers.
- Add a Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting the frontend refactor and documentation files.

## Security And Tenancy Impact

No server-side tenancy behavior changes. Queue data remains browser-local and scoped by existing content/field key. The app shell should still count jobs without exposing queued field text.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent. Live API-mode autosave/conflict testing is still a separate task.

## Implementation Order

1. Add typed queue DTO and helper functions to `guided-queue-contract.ts`.
2. Replace the component-local `QueueJob` parser/serializer with the shared helpers.
3. Keep same event dispatch and localStorage key behavior.
4. Add Russian report and run the standard checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `guided-form-actions.tsx` no longer owns a private queue payload DTO.
- Queue reads tolerate malformed or legacy browser payloads by returning `null` or sanitized strings.
- Queue writes still remove empty entries and dispatch the same queue-change event.
- Fixture visual smoke still proves queue banner count, disabled mutation controls, no queued content leakage, and no horizontal overflow.

## Risks And Recovery

- Risk: changing payload parsing could break legacy local queue entries. Mitigation: accept the same optional fields and sanitize string values defensively.
- Risk: future service-worker code cannot import this module directly while `sw.js` is static. Mitigation: keep this as source-level contract now and solve service-worker bundling separately.

## Status

- 2026-06-21: Started after UI Phase 10t.
- 2026-06-21: Implemented; typecheck, lint, build, safe visual smoke, whitespace check, and spec validation passed.
