# UI Phase 10q — Guided Form Debounced Autosave

## Objective

Add the first debounced autosave path for guided-form field mutation forms: when API-mode mutation is enabled, typing into a single guided field should schedule a non-locking save through the existing server action and show a Russian pending/synced/failed status.

## Non-Goals

- Do not implement durable offline queue, background sync scheduler, merge tooling, live recording, STT upload, media upload, AI assembly, or publication approval.
- Do not auto-create repeatable group rows while the user types.
- Do not change backend routes, database schema, migrations, provider settings, or generated OpenAPI.
- Do not enable fixture mutations.
- Do not store secrets, tokens, cookies, versions, or platform credentials in browser storage.

## Current-State Findings

- UI Phase 10p added browser-local draft recovery for guided-form mutation forms.
- Single field forms already submit to `saveGuidedFieldAction`.
- Repeatable group creation is a separate explicit action and should stay manual in this slice.
- Server actions already return typed state with recovery metadata.

## Assumptions And Open Questions

- Autosave must use intent `save`, never `lock`.
- Autosave should only run when `canSubmit` is true and the field is mutable.
- Local draft persistence remains the fallback while autosave is pending or failed.
- Debounce delay can be conservative for technical UX; 1200 ms is enough to avoid saving on every keystroke.

## Files And Modules

- Update `apps/web/src/components/phase04/guided-form-actions.tsx` with a scoped debounced autosave hook for single field forms.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting frontend client-component/docs changes.

## Security And Tenancy Impact

Autosave uses the same Next server action, HttpOnly cookie forwarding, CSRF forwarding, backend workspace authorization, and optimistic version checks as manual save. No auth material is stored in browser storage.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent and should verify autosave is disabled in fixture mode. Live autosave testing requires a running backend and authenticated browser session.

## Implementation Order

1. Add autosave status and debounce helper for single guided field forms.
2. Schedule non-locking autosave on visible field input/change when mutation is enabled.
3. Submit through a hidden `intent=save` button so existing server actions and recovery UI stay authoritative.
4. Keep repeatable group creation manual.
5. Preserve local draft recovery and fixture-mode disabled behavior.
6. Run typecheck, lint, web build, visual smoke, spec validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Single guided field forms show an autosave status line.
- Autosave is disabled in fixture/read-only mode.
- Manual save and lock buttons still work.
- Repeatable group creation stays manual.
- No backend schema, migration, OpenAPI, AI, STT, S3, or social connector behavior changes.

## Risks And Recovery

- This is not a durable offline queue. If the backend is unavailable, typed values remain in browser-local draft and the action state tells the user how to retry or refresh.

## Status

- 2026-06-21: Started after UI Phase 10p.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
