# UI Phase 10aa — Test Gate Integration

## Objective

Include the UI hardening deterministic checks in the standard `make test` gate so guided queue replay readiness and service-worker capability drift are checked whenever the repository test suite runs.

## Non-Goals

- Do not implement automatic guided-form replay, Background Sync, or service-worker mutations.
- Do not add frontend test framework dependencies.
- Do not call backend APIs from UI hardening checks.
- Do not change backend routes, database schema, migrations, OpenAPI, or generated API clients.
- Do not change visible UI behavior.

## Current-State Findings

- UI Phase 10z added `make test-ui-hardening`.
- `make test` still runs Python unit tests only, so the PWA/guided-queue hardening checks can be skipped by the default test gate.
- The two hardening checks are deterministic, backend-independent, and fast enough to run with the normal test suite.

## Assumptions And Open Questions

- It is acceptable for `make test` to depend on `test-ui-hardening`, because the checks validate product safety invariants rather than browser-only visual behavior.
- `make test-ui-hardening` remains separately callable for focused PWA/offline checks.
- Live API-mode smoke still belongs to a later slice.

## Files And Modules

- Update `Makefile`.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting the Makefile dependency change and documentation files.

## Security And Tenancy Impact

No runtime security changes. This slice reduces regression risk by making existing safety checks part of the normal test workflow.

## External API And Live-Test Prerequisites

No external API, live backend, browser state, or credentials are required.

## Implementation Order

1. Make `test` depend on `test-ui-hardening`.
2. Run `make test-ui-hardening` and `make test`.
3. Run the standard UI Phase checks and update docs.

## Tests And Commands

- `make test-ui-hardening`
- `make test`
- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Running `make test` executes `tools/check_sw_capabilities.mjs` and `tools/check_guided_queue_replay.mjs` before or along with unit tests.
- `make test-ui-hardening` remains available as a focused target.
- No visible UI, backend, OpenAPI, or migration behavior changes.

## Risks And Recovery

- Risk: `make test` becomes slightly broader and may fail on frontend dependency issues. This is intended because the hardening checks depend on repository dependencies and protect PWA/offline invariants.

## Status

- 2026-06-21: Started after UI Phase 10z.
- 2026-06-21: Implemented; `make test-ui-hardening`, `make test`, typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
