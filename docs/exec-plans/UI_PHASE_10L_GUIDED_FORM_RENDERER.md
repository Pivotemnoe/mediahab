# UI Phase 10l — Guided Form Renderer

## Objective

Add the first schema-driven guided form renderer to Content Studio, using the rubric version UI schema as the source of field sections and keeping all writes as posture-only.

## Non-Goals

- Do not implement autosave, block mutation, repeatable-group mutation, live recording, STT, media upload, AI assembly, or publication approval.
- Do not change backend routes, database schema, migrations, provider settings, or generated OpenAPI.
- Do not ask the user to invent generated fields such as hook, ratings, transitions, CTA, master text, or platform variants.
- Do not redesign the full Content Studio shell.

## Current-State Findings

- `ContentStudioShell` renders a useful technical studio, but the central factual input UI is still a static master-draft area plus input-block cards.
- Backend already has `GET /api/v1/content-items/{content_id}/guided-form`, returning `json_schema`, `ui_schema`, `generated_fields`, and `editorial_limits`.
- `apps/web/src/generated-api/openapi.json` does not currently list the content-item guided-form endpoint, even though the backend route exists.
- Existing API mode already reads content item, blocks, and platform variants.

## Assumptions And Open Questions

- For fixture mode, use a view-model representation of the `Обзор недели` preset input flow because fixture data is allowed behind a service boundary.
- For API mode, call `/api/v1/content-items/{content_id}/guided-form` with a locally typed DTO until OpenAPI is regenerated.
- The renderer is read/write posture only in this slice: field controls can display values, but persistence remains a later mutation slice.
- Repeatable groups should display existing block groups when API blocks exist and show one fixture item in fixture mode.

## Files And Modules

- Extend `apps/web/src/services/openapi-types.ts` with `GuidedFormResponse` and UI schema field DTOs.
- Extend `apps/web/src/services/content.ts` with guided-form view models and API/fixture mapping.
- Update `apps/web/src/components/phase04/content-studio-shell.tsx` to render factual fields from the view model.
- Update `docs/frontend/MOCK_DATA_STRATEGY.md`.
- Add Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend service/component/docs changes.

## Security And Tenancy Impact

No secrets or credentials are added. API mode still relies on backend workspace authorization. The UI does not call STT, S3, AI, or social providers directly.

## External API And Live-Test Prerequisites

Fixture mode remains the default for build and visual smoke. API mode requires a running backend, authenticated session, and the existing guided-form backend endpoint.

## Implementation Order

1. Add DTOs for guided form schema response.
2. Build a Content Studio guided form view model from fixture schema and API schema.
3. Render object fields, long/voice fields, media picker posture, and repeatable groups.
4. Keep generated fields visible as "generated later" chips, not as user input.
5. Run typecheck, lint, build, visual smoke, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `/app/content/demo-review` shows a rubric-driven guided form for factual input.
- Generated fields are not rendered as user-input fields.
- Repeatable `dishes` section renders as a repeatable group.
- The UI remains Russian and does not claim unsaved edits are persisted.
- Build and validation pass in fixture mode without a backend.

## Risks And Recovery

- The frontend uses a local DTO for `guided-form` until OpenAPI is refreshed; keep this documented and remove the local gap once generated types catch up.
- This is a display/posture renderer, not a complete JSON Schema forms engine. Advanced conditional visibility and validation UI should follow after mutation wiring.

## Status

- 2026-06-21: Started after UI Phase 10k.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
