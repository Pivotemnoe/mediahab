# UI Phase 05 — Desktop Content Studio

## Objective

Replace the technical `/app/content/[contentId]` placeholder with the Editorial Studio desktop layout: input blocks, voice mock, transcript review, master draft, AI suggestions, fact locks, platform previews, character budgets, and autosave posture.

## Non-Goals

- No mobile capture PWA redesign; that belongs to UI Phase 06.
- No backend mutations, live recording, STT call, or AI generation call.
- No publication scheduling modal or connector state work; that belongs to UI Phase 07.
- No changes to database, migrations, or OpenAPI.

## Current-State Findings

- `/app/content/[contentId]` renders `ContentStudioShell` from `components/phase04/content-studio-shell.tsx`.
- The current screen is a technical Phase 04 vertical slice showing guided mode, full editor, media and transcript blocks.
- Canonical UX requires a desktop content studio with left source/dictation, center master draft/AI review/history, and right platform previews/checks.
- UI roadmap maps UI Phase 05 specifically to Desktop Content Studio.

## Assumptions And Open Questions

- Fixture data is acceptable until real content/AI/publication API wiring is added.
- Existing backend Phase 04/05 endpoints remain untouched.
- Platform preview actions are disabled posture only; they must not imply live publication.

## Files And Modules

- Add `apps/web/src/features/content-studio/content-studio-fixtures.ts`.
- Update `ContentStudioShell` in `apps/web/src/components/phase04/content-studio-shell.tsx`.
- Add Russian UI Phase 05 report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend/docs changes.

## Security And Tenancy Impact

No backend changes. UI must preserve the human-review posture and should not imply autonomous publication.

## External API And Live-Test Prerequisites

None.

## Implementation Order

1. Add this execution plan.
2. Add content-studio fixture data.
3. Replace `ContentStudioShell` with responsive desktop studio layout.
4. Run typecheck, lint, build, screenshots, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke `/app/content/demo-review` at 390/768/1280/1440 px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `/app/content/[contentId]` shows source/dictation, transcript review, master draft, AI suggestions, fact locks, platform previews, counters, warnings, autosave, and section-level actions.
- Telegram/MAX/Instagram previews show independent budgets and statuses.
- No “regenerate everything” as the only visible AI action.
- Typecheck/build pass.

## Risks And Recovery

- Static fixture screen must be replaced with API-backed form state later.
- Keep Content Studio changes localized so UI Phase 06 can own mobile capture without conflicting with desktop shell work.

## Status

- 2026-06-20: Started after UI Phase 04 commit and push.
