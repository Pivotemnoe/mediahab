# UI Phase 10g — Library And Planning Service Boundaries

## Objective

Extend `NEXT_PUBLIC_DATA_MODE=api | fixtures` service-boundary support to the examples, media, and calendar/planning screens.

## Non-Goals

- Do not implement live example import, approval/rejection, embedding, media upload, media reorder, schedule/reschedule/cancel mutations, or publication worker controls.
- Do not change backend routes, database schema, migrations, or OpenAPI generation.
- Do not add dependencies.

## Current-State Findings

- `/app/examples` read fixture arrays directly from the page.
- `/app/calendar` read fixture arrays directly from the page.
- `/app/media` rendered `MediaLibraryShell`, which read media fixtures directly inside the component.
- Backend already exposes read endpoints that can support the first slice: `/projects/{project_id}/examples`, `/content-items/{content_id}/media`, and `/publications`.

## Assumptions And Open Questions

- API mode can use the first workspace, first project, and first content item until selectors are added.
- Media detail endpoint exists, but the first list slice uses `ContentMediaResponse` only to avoid fan-out calls.
- Calendar uses publication schedule data; richer calendar grouping can follow once workspace/project selectors exist.

## Files And Modules

- Extend `apps/web/src/services/openapi-types.ts` with examples and content media DTOs.
- Add `apps/web/src/services/library-planning.ts`.
- Update `/app/examples`.
- Update `/app/calendar`.
- Update `/app/media`.
- Update `MediaLibraryShell`.
- Update mock/service strategy and add Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend service, page/component wiring, and docs.

## Security And Tenancy Impact

No secrets or credentials are added. API mode delegates authorization to backend endpoints. Media storage keys and direct delivery URLs are not exposed by this UI slice.

## External API And Live-Test Prerequisites

API mode requires a running backend and authenticated browser session. Fixture mode remains the default for build and visual smoke.

## Implementation Order

1. Add read DTOs for examples and content media.
2. Add examples/media/calendar view-model service.
3. Wire pages and shell components to the service.
4. Keep mutation buttons posture-only.
5. Run typecheck, lint, build, visual smoke, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/examples`, `/app/media`, and `/app/calendar`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- The three screens no longer own direct fixture arrays as their primary data source.
- Each screen shows active data mode.
- Fixture mode still builds without live backend.
- API mode has typed read mappers and safe fixture fallback.

## Risks And Recovery

- First workspace/project/content selection is temporary. Add explicit selectors before treating these screens as production-complete.
- Media API list currently shows content-media linkage data only; richer asset details should be added with a targeted media-service slice.

## Status

- 2026-06-21: Started after UI Phase 10f commit and push.
