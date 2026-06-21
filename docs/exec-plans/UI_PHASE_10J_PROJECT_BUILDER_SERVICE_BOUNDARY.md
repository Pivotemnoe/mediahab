# UI Phase 10j — Project Builder Service Boundary

## Objective

Move Project Builder, Project Wizard, Project Settings, and Rubric Builder fixture reads behind `apps/web/src/services/projects.ts`, keeping `NEXT_PUBLIC_DATA_MODE=api | fixtures` as the selection mechanism.

## Non-Goals

- Do not implement project/rubric create, update, clone, import, export, or save mutations.
- Do not implement a full guided-form schema renderer.
- Do not change backend routes, database schema, migrations, or OpenAPI generation.
- Do not redesign the UI beyond the current Russian technical Visual Builder.

## Current-State Findings

- `ProjectIndexShell` and rubric list already receive basic service view models.
- `NewProjectShell`, `ProjectDetailShell`, `ProjectBuilderShell`, `ProjectSettingsShell`, `RubricBuilderShell`, `NewRubricShell`, and `RubricDetailShell` still read project-wizard/rubric-builder fixture arrays directly or use local static arrays.
- Backend already exposes project detail and rubric list endpoints that can support API-mode labels and summaries.
- Rubric form-canvas assets remain fixture-backed because this slice does not render server JSON schema into editable form controls.

## Assumptions And Open Questions

- API mode can use `/api/v1/projects/{projectId}` and `/api/v1/projects/{projectId}/rubrics` for labels and counts.
- Field palette, repeatable groups, style rules, preview blocks, and wizard suggestions remain safe fixture assets behind the service.
- Real mutations will be connected later with CSRF, version checks, and server validation.

## Files And Modules

- Extend `apps/web/src/services/projects.ts` with builder/wizard/settings/rubric asset view models.
- Update project builder pages under `/app/projects`.
- Update `apps/web/src/components/phase03/project-builder-shell.tsx`.
- Update mock/service strategy and add Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend service, component wiring, and docs.

## Security And Tenancy Impact

No secrets are added. API mode delegates authorization to backend endpoints. Import/export buttons remain posture-only.

## External API And Live-Test Prerequisites

API mode requires a running backend and authenticated session. Fixture mode remains the default for build and visual smoke.

## Implementation Order

1. Add project wizard, builder, settings, and rubric asset view model types.
2. Add fixture and API mappers in `services/projects.ts`.
3. Wire pages/components to view models.
4. Keep mutation buttons disabled or posture-only.
5. Run typecheck, lint, build, visual smoke, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/projects/new`, `/app/projects/demo/builder`, `/app/projects/demo/settings`, `/app/projects/demo/rubrics`, `/app/projects/demo/rubrics/demo`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `ProjectBuilderShell` no longer imports project-wizard or rubric-builder fixture files directly.
- Project builder routes receive service view models.
- API mode can display project/rubric labels from backend where endpoints exist.
- UI still builds in fixture mode without backend.

## Risks And Recovery

- This is a service-boundary slice, not a production-complete builder.
- The next major frontend slice should decide whether guided form rendering or mutation wiring comes first.

## Status

- 2026-06-21: Implemented and verified after UI Phase 10i.
