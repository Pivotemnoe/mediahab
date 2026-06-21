# UI Phase 10m — Guided Form Mutation Boundary

## Objective

Add the first real mutation boundary for guided-form fields in Content Studio: server-side form actions can save top-level fields, patch existing repeatable-group fields, and add a repeatable group through the backend API with CSRF and optimistic version data.

## Non-Goals

- Do not implement full offline queue, debounced autosave, conflict-resolution UI, live recording, STT, media upload, AI assembly, or publication approval.
- Do not implement project/rubric mutations.
- Do not bypass backend authorization, CSRF, or workspace checks.
- Do not call social APIs, S3, AI providers, or STT providers directly from the frontend.

## Current-State Findings

- UI Phase 10l added a read-only guided form renderer.
- Backend has the required mutation endpoints:
  - `PUT /api/v1/content-items/{content_id}/blocks/{field_key}`;
  - `PATCH /api/v1/content-blocks/{block_id}`;
  - `POST /api/v1/content-items/{content_id}/repeatable-groups/{group_key}`.
- Mutations require cookie authentication, `X-CSRF-Token`, and item version checks for top-level block/repeatable creation.
- Existing frontend runtime only has `apiGet`/`safeApiGet`; no shared mutation helper exists yet.
- Current generated OpenAPI already contains `GET /api/v1/content-items/{content_id}/guided-form`, so the UI Phase 10l documentation needs a correction.

## Assumptions And Open Questions

- Server actions are the conservative first step because they can forward HttpOnly session cookies and the readable CSRF cookie from the server side.
- Fixture mode keeps mutation buttons disabled; API mode can enable them when a real content item and guided-form response are available.
- Patch-block endpoint does not take an item version. Top-level PUT and repeatable group creation send the current item version.
- Conflict UI remains minimal in this slice; explicit conflict handling is a later UI task.

## Files And Modules

- Extend `apps/web/src/services/runtime.ts` with a CSRF-aware `apiRequest` helper.
- Add `apps/web/src/services/content-actions.ts` server actions for guided-form saves.
- Extend `apps/web/src/services/content.ts` with block IDs, mutation metadata, and add-repeatable field metadata.
- Update `apps/web/src/components/phase04/content-studio-shell.tsx` forms/buttons.
- Correct UI Phase 10l report/plan wording about generated OpenAPI.
- Add Russian UI Phase 10m report and update mock/service strategy.

## Database Migration And Rollback

No migration. Rollback is reverting frontend runtime/actions/component/docs changes.

## Security And Tenancy Impact

Frontend mutations forward existing cookies to the backend and include the CSRF header from the `tmh_csrf` cookie. Backend remains the authority for workspace access, role checks, version checks, validation, and fact locking.

## External API And Live-Test Prerequisites

Live mutation testing requires a running backend and authenticated browser session. Fixture visual smoke remains backend-independent and verifies that mutation controls stay disabled when using fixtures.

## Implementation Order

1. Add CSRF-aware mutation helper.
2. Add server actions for save/lock field and add repeatable group.
3. Extend guided-form view model with block IDs, source keys, mutation mode, and item version.
4. Wire form controls to actions while keeping fixture mode disabled.
5. Run typecheck, lint, build, visual smoke, spec validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Fixture mode displays guided-form fields with disabled save/lock controls.
- API mode view model can enable save/lock forms only when guided-form data and a content item version are available.
- Server actions use backend API routes with CSRF and cookie forwarding.
- The UI remains Russian and does not claim offline autosave is complete.

## Risks And Recovery

- Server actions depend on same-site cookie availability in deployment. If the frontend and API are split across domains, a deployment-level cookie/domain decision is required.
- Conflict display is intentionally minimal; a later slice should surface 409 details inline.

## Status

- 2026-06-21: Started after UI Phase 10l.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
