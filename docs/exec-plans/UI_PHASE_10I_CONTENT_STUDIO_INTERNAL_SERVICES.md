# UI Phase 10i — Content Studio Internal Service Boundary

## Objective

Move the remaining Content Studio and mobile-capture fixture reads behind `apps/web/src/services/content.ts`, while keeping `NEXT_PUBLIC_DATA_MODE=api | fixtures` as the selection mechanism.

## Non-Goals

- Do not implement live recording, live STT mutation, autosave mutation, block mutation, AI mutation, media upload, or publication approval.
- Do not add backend endpoints for revision history or transcription job lists.
- Do not change database schema, migrations, provider settings, or OpenAPI generation.
- Do not redesign the UI beyond the current Russian technical design.

## Current-State Findings

- `ContentStudioShell` already receives a top-level summary view model, but still imports content-studio and mobile-capture fixtures directly.
- `NewContentShell` is fully fixture-driven.
- Backend already exposes read endpoints for content blocks and platform variants: `/content-items/{content_id}/blocks` and `/content-items/{content_id}/variants`.
- Backend does not expose a content revision list endpoint; revision history UI remains posture/fallback in this slice.

## Assumptions And Open Questions

- API mode can map content blocks into the left-side block list, transcript preview, fact locks, and master draft excerpt.
- API mode can map platform variants into platform preview cards.
- Mobile capture remains fixture-backed until content creation and recording flows are connected.
- Revision history remains fallback until a list endpoint is approved.

## Files And Modules

- Extend `apps/web/src/services/openapi-types.ts` with block and platform variant DTOs.
- Extend `apps/web/src/services/content.ts` with internal studio and mobile capture view models.
- Update `ContentStudioShell`.
- Update `NewContentShell`.
- Update `/app/content/new`.
- Update mock/service strategy and add Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend service, component wiring, and docs.

## Security And Tenancy Impact

No secrets are added. API mode relies on backend authorization. Frontend still does not call STT, AI, S3, or social providers directly.

## External API And Live-Test Prerequisites

API mode requires a running backend and authenticated session. Fixture mode remains the default for build and visual smoke.

## Implementation Order

1. Add DTOs for `BlockOut`, `BlocksResponse`, `PlatformVariantOut`, and `PlatformVariantsResponse`.
2. Extend `ContentStudioViewModel` and add `NewContentViewModel`.
3. Map API blocks/variants where available and keep safe fallback for unavailable panels.
4. Wire pages/components to view models.
5. Run typecheck, lint, build, visual smoke, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` and `/app/content/new`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Content Studio component no longer imports content/mobile fixture files directly.
- `/app/content/new` receives a view model from the content service.
- API mode has typed mappers for content blocks and platform variants with fixture fallback.
- UI still builds in fixture mode without backend.

## Risks And Recovery

- Block-to-editor mapping is intentionally conservative because field schema rendering is not part of this slice.
- Revision history and live capture should be implemented separately once backend list/mutation contracts are approved.

## Status

- 2026-06-21: Implemented and verified after UI Phase 10h.
