# UI Phase 08 — Examples, Media, Calendar

## Objective

Upgrade `/app/examples`, `/app/media`, and `/app/calendar` to the UI roadmap target: example library with import and filters, media library with ordering/compatibility posture, and calendar with scheduled publication grid.

## Non-Goals

- No real import/upload/schedule mutations.
- No drag-and-drop implementation.
- No backend route/model changes.
- No billing/account/workspace redesign; UI Phase 09 owns that.

## Current-State Findings

- `/app/examples` is a compact approved examples list.
- `/app/media` renders the technical Phase 04 media shell.
- `/app/calendar` is a compact scheduling list.
- Canonical UX requires import, filters, media library, calendar, and later drag-and-drop scheduling.

## Assumptions And Open Questions

- Fixture data is acceptable until real API wiring is added.
- Media compatibility warnings should be visible before publication approval.
- Calendar shows schedule posture and outbox state but does not mutate backend.

## Files And Modules

- Add `apps/web/src/features/library-planning/library-planning-fixtures.ts`.
- Update `apps/web/src/app/app/examples/page.tsx`.
- Update `MediaLibraryShell` in `apps/web/src/components/phase04/content-studio-shell.tsx`.
- Update `apps/web/src/app/app/calendar/page.tsx`.
- Add Russian UI Phase 08 report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend/docs changes.

## Security And Tenancy Impact

No backend changes. Example/media fixtures must not imply cross-workspace retrieval.

## External API And Live-Test Prerequisites

None.

## Implementation Order

1. Add this execution plan.
2. Add examples/media/calendar fixture data.
3. Upgrade examples page.
4. Upgrade media library shell.
5. Upgrade calendar page.
6. Run typecheck, lint, build, screenshots, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke `/app/examples`, `/app/media`, `/app/calendar` at 390/768/1280/1440 px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Examples page shows filters, import actions, approval/rejection posture, retrieval rule and reindex action.
- Media page shows upload posture, filters, ordered media, compatibility warnings, cover selection and remove-from-content posture.
- Calendar page shows scheduled grid, timezone/outbox details and schedule/reschedule/cancel posture.
- Typecheck/build pass.

## Risks And Recovery

- Static fixture states must be replaced with real examples/media/calendar APIs later.
- Keep drag handles as posture only until a drag/drop library or accessible reorder flow is selected.

## Status

- 2026-06-20: Started after UI Phase 07 commit and push.
