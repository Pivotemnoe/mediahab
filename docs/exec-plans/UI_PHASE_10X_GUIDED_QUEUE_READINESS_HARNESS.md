# UI Phase 10x — Guided Queue Readiness Harness

## Objective

Add a deterministic local harness for guided-form queue replay readiness so the policy introduced in UI Phase 10w is checked directly outside the in-app browser localStorage limitations.

## Non-Goals

- Do not add a frontend test framework dependency.
- Do not implement automatic service-worker replay or Background Sync.
- Do not call backend APIs from the harness.
- Do not change backend routes, database schema, migrations, OpenAPI, or generated API clients.
- Do not enable fixture mutations.
- Do not store cookies, CSRF tokens, bearer tokens, connector credentials, or platform secrets in browser storage.

## Current-State Findings

- UI Phase 10w moved guided queue replay policy into `apps/web/src/services/guided-queue-replay.ts`.
- In-app browser smoke can verify fixture UI rendering, but cannot seed guided queue `localStorage` because browser security policy blocks that write path.
- The web package currently has no Jest/Vitest/Playwright test runner; adding one would be a larger dependency decision than this slice needs.
- The workspace already has TypeScript installed under `apps/web/node_modules` for `tsc`/Next build.

## Assumptions And Open Questions

- A small Node `.mjs` harness under `tools/` is acceptable for this slice if it imports and executes the real TypeScript source by transpiling it with the local TypeScript package.
- The harness should assert only pure replay-readiness behavior, not browser storage or React rendering.
- Full browser/API-mode verification still belongs to a later slice with authenticated backend session and CSRF setup.

## Files And Modules

- Add `tools/check_guided_queue_replay.mjs`.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is deleting the harness and documentation files.

## Security And Tenancy Impact

No runtime security changes. The harness reinforces that automatic replay remains disabled and no auth material is part of queue readiness.

## External API And Live-Test Prerequisites

No external API, live backend, or browser state is required.

## Implementation Order

1. Add Node harness that transpiles `guided-queue-replay.ts` with local TypeScript.
2. Assert empty/online, empty/offline, queued/online, queued/offline, and Russian plural forms.
3. Run the harness alongside typecheck, lint, build, visual smoke, spec validation, and diff checks.
4. Add Russian report with commands and limitations.

## Tests And Commands

- `node tools/check_guided_queue_replay.mjs`
- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- The harness executes the real `guided-queue-replay.ts` source.
- Empty online queue has no shell message.
- Empty offline queue has the offline draft message.
- Online queued jobs report `manual_retry_required`, `canAutoReplay=false`, and the Russian "Автоповтор выключен" copy.
- Offline queued jobs use correct Russian field plural forms for 1, 2, and 5 queued jobs.

## Risks And Recovery

- Risk: a bespoke harness is less capable than a full test runner. Mitigation: keep it tiny, deterministic, and focused on pure policy logic until frontend test dependencies are approved.
- Risk: TypeScript transpilation in the harness could drift from Next/tsc settings. Mitigation: the normal `make typecheck` and Next build still run as authoritative compile checks.

## Status

- 2026-06-21: Started after UI Phase 10w.
- 2026-06-21: Implemented; deterministic harness, typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
