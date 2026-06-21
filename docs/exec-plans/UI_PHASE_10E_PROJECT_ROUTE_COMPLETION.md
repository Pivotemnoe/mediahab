# UI Phase 10e — Project Route Completion

## Objective

Close the remaining project/rubric URL gaps from the frontend route map by adding route-level shells for project settings, new rubric creation, and rubric detail editing.

## Non-Goals

- Do not implement live rubric CRUD mutations.
- Do not add drag-and-drop persistence.
- Do not change backend routes, database schema, OpenAPI, or migrations.
- Do not add new frontend dependencies.

## Current-State Findings

- `/app/projects/[projectId]/rubrics` exists and already uses the project/rubric service boundary.
- `/app/projects/[projectId]/rubrics/new` was missing.
- `/app/projects/[projectId]/rubrics/[rubricId]` was missing.
- `/app/projects/[projectId]/settings` was missing.
- Several routes marked missing in `docs/frontend/ROUTE_MAP.md` already exist after later UI phases and need documentation cleanup.

## Assumptions And Open Questions

- The new route shells can be fixture/service-boundary backed until real API mutations are implemented.
- Friendly project ids such as `chto-poest-armavir` can keep fixture fallback; API mode still expects real UUIDs for project/rubric calls.
- Saving buttons must not imply persisted changes before mutation endpoints are wired.

## Files And Modules

- Add `/app/projects/[projectId]/settings`.
- Add `/app/projects/[projectId]/rubrics/new`.
- Add `/app/projects/[projectId]/rubrics/[rubricId]`.
- Extend `apps/web/src/services/projects.ts` with rubric ids, hrefs, and detail view-model selection.
- Extend `ProjectBuilderShell` module with `ProjectSettingsShell`, `NewRubricShell`, and `RubricDetailShell`.
- Update `docs/frontend/ROUTE_MAP.md`.
- Add Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting route files, shell additions, service view-model additions, and docs.

## Security And Tenancy Impact

No secrets or live credentials are added. New screens are read-only/posture UI until backend mutations are connected. API mode still delegates authorization to backend endpoints.

## External API And Live-Test Prerequisites

None for fixture mode. API mode requires a running backend and authenticated session.

## Implementation Order

1. Add route directories and pages.
2. Add route shell components and link existing rubric/project navigation to the new routes.
3. Extend the project service view-model with rubric ids/hrefs and detail selection.
4. Update route map and report.
5. Run typecheck, lint, build, visual smoke, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for the new routes at mobile and desktop widths
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- The three previously missing routes render.
- Rubric list links open rubric detail routes.
- Project detail links to project settings.
- UI copy stays Russian and does not claim that changes are saved before API mutations exist.
- Checks pass.

## Risks And Recovery

- Route shells add visible UI before real save behavior. Labels keep save actions disabled until API integration.
- Detail route selection falls back to fixture data for friendly ids and unavailable API data.

## Status

- 2026-06-21: Started after UI Phase 10d commit and push.
