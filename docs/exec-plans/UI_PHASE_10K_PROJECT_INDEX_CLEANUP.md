# UI Phase 10k — Project Index Service Cleanup

## Objective

Move the last Project Index static entry-point list from `ProjectBuilderShell` into `apps/web/src/services/projects.ts`.

## Non-Goals

- Do not change backend routes, database schema, migrations, or OpenAPI generation.
- Do not add project creation/import/export mutations.
- Do not redesign the Project Index UI.

## Current-State Findings

- UI Phase 10j moved Project Builder/Wizard/Settings data into the projects service.
- One component-local static list remained: Project Index entry points for "from scratch", "preset", and "package import".

## Files And Modules

- Extend `ProjectIndexViewModel` with entry points.
- Map entry point icon keys to Lucide icons inside `ProjectIndexShell`.
- Update the Russian report and mock/service strategy if needed.

## Database Migration And Rollback

No migration. Rollback is reverting frontend service/component/docs changes.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/projects`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `ProjectBuilderShell` has no component-local project-entry fixture list.
- Project Index still renders the same three entry point cards.

## Status

- 2026-06-21: Started after UI Phase 10j commit and push.
- 2026-06-21: Implemented; verification pending.
- 2026-06-21: Typecheck, lint, build, visual smoke, and spec validation passed.
