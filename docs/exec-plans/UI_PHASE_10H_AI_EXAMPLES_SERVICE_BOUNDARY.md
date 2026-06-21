# UI Phase 10h — AI And Project Examples Service Boundary

## Objective

Extend `NEXT_PUBLIC_DATA_MODE=api | fixtures` service-boundary support to `/app/ai` and `/app/projects/[projectId]/examples`.

## Non-Goals

- Do not implement live AI mutations from the frontend.
- Do not add an AI-run list backend endpoint.
- Do not change database schema, migrations, provider configuration, or OpenAPI generation.
- Do not change visual direction beyond the technical Russian UI already in place.

## Current-State Findings

- `/app/ai` rendered pipeline steps, retrieved examples, and AI-run rows from arrays inside `AiPipelineShell`.
- `/app/projects/[projectId]/examples` passed only `projectId`; the component rendered static example rows and metrics.
- Backend already exposes typed project, rubric, content-list, project-example, and AI-run detail/generation contracts.
- Backend does not expose a general "latest AI runs" list endpoint, so the UI must not pretend that journal rows are server-authoritative.

## Assumptions And Open Questions

- API mode may use the first workspace, first project, and first content item for `/app/ai` until explicit selectors exist.
- Project-scoped examples can fetch the exact `projectId` from the route.
- AI-run history remains fixture/status posture until a list endpoint is added.
- Project example metrics should be derived from returned examples where possible.

## Files And Modules

- Add `apps/web/src/services/ai.ts`.
- Extend `apps/web/src/services/openapi-types.ts` with `GenerationRunOut`.
- Update `/app/ai`.
- Update `/app/projects/[projectId]/examples`.
- Update `AiPipelineShell` and `ExamplesLibraryShell`.
- Update mock/service strategy and add Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend service, component wiring, and docs.

## Security And Tenancy Impact

No secrets are added. API mode relies on backend authorization and server-side cookie forwarding. Frontend still does not call AI providers directly.

## External API And Live-Test Prerequisites

API mode requires a running backend and authenticated session. Fixture mode remains the default for build and visual smoke.

## Implementation Order

1. Add AI view-model service and missing DTO shape.
2. Wire AI and project examples pages to the service.
3. Keep mutation buttons posture-only.
4. Document the missing AI-run list endpoint as a limitation.
5. Run typecheck, lint, build, visual smoke, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/ai` and `/app/projects/demo/examples`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- AI pages no longer own direct fixture arrays as their primary data source.
- Each screen shows active data mode.
- Project examples can map API examples and rubric names.
- AI-run journal clearly remains non-authoritative until backend exposes a list endpoint.

## Risks And Recovery

- First-content selection is temporary for `/app/ai`; add selectors before productionizing the AI console.
- Real AI mutations should be wired with CSRF, optimistic state, and explicit user confirmation in a separate slice.

## Status

- 2026-06-21: Implemented, verified, and ready to commit after UI Phase 10g.
