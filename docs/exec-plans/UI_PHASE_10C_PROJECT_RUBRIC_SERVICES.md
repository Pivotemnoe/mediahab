# UI Phase 10c — Project And Rubric Service Boundaries

## Objective

Extend the UI service-boundary pattern to project and rubric builder screens so they can use `NEXT_PUBLIC_DATA_MODE=api | fixtures` without making static builds depend on a live backend.

## Non-Goals

- Do not replace the full project wizard form with live mutations yet.
- Do not implement drag/drop persistence in this subtask.
- Do not add new dependencies.
- Do not change backend endpoints or migrations.

## Current-State Findings

- Dashboard and publications already use service boundaries after UI Phase 10b.
- Project and rubric pages still directly import fixture arrays.
- OpenAPI already exposes project list and rubric list endpoints.

## Assumptions And Open Questions

- Project list API requires an authenticated workspace from `/api/v1/me`.
- Rubric builder API mode needs a real project UUID route param; friendly slugs can continue using fixture fallback until slug resolution exists.
- The builder inspector can remain fixture-backed while the list/sidebar moves to the service layer.

## Files And Modules

- Extend `apps/web/src/services/openapi-types.ts` with rubric DTOs.
- Add `apps/web/src/services/projects.ts`.
- Update `/app/projects`.
- Update `/app/projects/[projectId]/rubrics`.
- Update `ProjectIndexShell` and `RubricBuilderShell`.
- Add Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend service and screen wiring changes.

## Security And Tenancy Impact

No secrets are added. API mode continues to rely on backend membership checks.

## External API And Live-Test Prerequisites

API mode requires a running backend and authenticated session.

## Implementation Order

1. Add project/rubric view-model service.
2. Wire project index and rubric builder list to the service.
3. Keep fixture fallback for static build and friendly demo route params.
4. Run typecheck, lint, build, visual smoke, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/projects` and `/app/projects/chto-poest-armavir/rubrics`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Project index and rubric list no longer import fixture arrays directly.
- Screens show the active data mode.
- Fixture mode build remains stable.
- Checks pass.

## Risks And Recovery

- API mode rubric screen needs UUID route params until slug-to-project resolution is implemented.
- The central rubric field editor remains fixture-backed and should be moved in a later slice.

## Status

- 2026-06-20: Started after UI Phase 10b commit.
