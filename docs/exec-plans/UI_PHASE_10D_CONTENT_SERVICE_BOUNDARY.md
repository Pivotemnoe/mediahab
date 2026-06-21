# UI Phase 10d — Content Studio Service Boundary

## Objective

Extend the `NEXT_PUBLIC_DATA_MODE=api | fixtures` service-boundary pattern to the content index and the top-level Content Studio summary without making the full editor, voice flow, AI actions, or autosave depend on live backend state.

## Non-Goals

- Do not implement live content creation, patching, autosave, or optimistic concurrency.
- Do not wire guided-form fields, content blocks, transcription, AI assembly, revisions, or platform variants yet.
- Do not change backend routes, DTOs, database schema, or migrations.
- Do not add dependencies.

## Current-State Findings

- `/app/content` and `/app/content/[contentId]` rendered fixture data directly from `ContentStudioShell`.
- The backend already exposes `GET /projects/{project_id}/content-items` and `GET /content-items/{content_id}`.
- Existing OpenAPI service types already include `ContentItemOut` and `ContentListResponse`.
- Dashboard, publications, projects, and rubrics already use the same service boundary pattern.

## Assumptions And Open Questions

- API mode can safely use the first workspace and first project until a real project selector drives the content list.
- Friendly demo route `demo-review` remains fixture-backed because the API endpoint expects a UUID content item id.
- Rubric labels can be resolved through `GET /projects/{project_id}/rubrics`; missing labels fall back to a generic Russian label.
- The central editor still uses fixture blocks and should move separately with a form-state/autosave plan.

## Files And Modules

- Add `apps/web/src/services/content.ts`.
- Update `/app/content` to load `getContentIndexViewModel()`.
- Update `/app/content/[contentId]` to load `getContentStudioViewModel(contentId)`.
- Update `ContentIndexShell` and `ContentStudioShell` to receive view-models.
- Update mock/service strategy and add Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting the frontend service and screen wiring.

## Security And Tenancy Impact

No secrets or credentials are added. API mode delegates tenancy checks to backend auth/session handling and falls back to fixtures on unavailable API data.

## External API And Live-Test Prerequisites

API mode requires a running backend and authenticated browser session. Fixture mode remains the default for build and visual smoke.

## Implementation Order

1. Add content index and studio view-model service.
2. Wire content routes to the service.
3. Keep fixture fallback for static build and friendly demo ids.
4. Run typecheck, lint, build, visual smoke, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content` and `/app/content/demo-review`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Content index no longer owns the material list directly inside the component.
- Content Studio top summary uses a view-model and shows active data mode.
- Fixture mode build remains stable.
- Friendly demo content route remains usable without a live backend.

## Risks And Recovery

- API mode currently lists only the first project. Add project selection before treating the content index as a complete workspace-wide list.
- Full content-block editing, autosave, STT, AI run state, and platform variant state remain fixture-backed and need a dedicated implementation slice.

## Status

- 2026-06-21: Started after UI Phase 10c commit and push.
