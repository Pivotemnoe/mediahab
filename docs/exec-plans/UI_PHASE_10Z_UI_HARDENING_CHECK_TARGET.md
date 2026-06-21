# UI Phase 10z — UI Hardening Check Target

## Objective

Promote the guided queue replay and service-worker capability checks from ad hoc commands into a Make target so PWA/offline safety gates are easy to run consistently before future replay work.

## Non-Goals

- Do not implement automatic guided-form replay, Background Sync, or service-worker mutations.
- Do not add a frontend test framework dependency.
- Do not call backend APIs from the new check target.
- Do not change backend routes, database schema, migrations, OpenAPI, or generated API clients.
- Do not change visible UI behavior.

## Current-State Findings

- UI Phase 10x added `tools/check_guided_queue_replay.mjs`.
- UI Phase 10y added `tools/check_sw_capabilities.mjs`.
- Both checks are documented in reports, but `Makefile` has no single target for them.
- The checks rely on repository dependencies already installed by the existing `deps` target.

## Assumptions And Open Questions

- A dedicated `make test-ui-hardening` target is clearer than hiding these checks inside `make lint` or `make test`.
- The target should stay lightweight and backend-independent.
- Future frontend test framework adoption can either wrap this target or replace the bespoke harnesses after explicit dependency approval.

## Files And Modules

- Update `Makefile`.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting the Makefile and documentation changes.

## Security And Tenancy Impact

No runtime security changes. This slice makes existing safety checks easier to run consistently.

## External API And Live-Test Prerequisites

No external API, live backend, browser state, or credentials are required.

## Implementation Order

1. Add `test-ui-hardening` to `.PHONY`.
2. Add target that runs `tools/check_sw_capabilities.mjs` and `tools/check_guided_queue_replay.mjs`.
3. Run the new target and the standard checks.
4. Add Russian report.

## Tests And Commands

- `make test-ui-hardening`
- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `make test-ui-hardening` runs both deterministic hardening checks.
- The target depends on `deps`, matching the existing Makefile dependency model.
- No visible UI, backend, OpenAPI, or migration behavior changes.

## Risks And Recovery

- Risk: a new Make target is missed by users until documented in reports. Mitigation: include it in the 10z report and future recommended check list.

## Status

- 2026-06-21: Started after UI Phase 10y.
- 2026-06-21: Implemented; `make test-ui-hardening`, typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
