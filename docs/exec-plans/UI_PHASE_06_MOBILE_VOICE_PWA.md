# UI Phase 06 — Mobile Voice PWA

## Objective

Replace `/app/content/new` with a mobile-first PWA capture flow: step flow, recording states, offline draft, resume flow, review and assemble, compact previews, and installable PWA posture.

## Non-Goals

- No real browser microphone implementation.
- No live upload, STT call, or background sync implementation.
- No desktop Content Studio changes; UI Phase 05 owns that screen.
- No publication connector work; UI Phase 07 owns publication operations.
- No changes to database, migrations, or OpenAPI.

## Current-State Findings

- `/app/content/new` renders `NewContentShell` from `components/phase04/content-studio-shell.tsx`.
- Current screen is a technical desktop form for selecting project/rubric.
- Canonical UX requires a mobile-first step flow with recording states, offline draft visibility, resume flow, review and assemble, compact previews, and installable PWA shell.
- Runtime PWA shell and service worker already exist from earlier phases; this phase is UI state representation only.

## Assumptions And Open Questions

- Fixture data is acceptable until real recorder/state/storage integration is added.
- `/app/content/new` can be the MVP capture entry point on both mobile and desktop.
- Offline state is shown as a clear posture, not a real network-state detector yet.

## Files And Modules

- Add `apps/web/src/features/mobile-capture/mobile-capture-fixtures.ts`.
- Update `NewContentShell` in `apps/web/src/components/phase04/content-studio-shell.tsx`.
- Add Russian UI Phase 06 report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend/docs changes.

## Security And Tenancy Impact

No backend changes. UI must not request real microphone permission in this fixture phase.

## External API And Live-Test Prerequisites

None.

## Implementation Order

1. Add this execution plan.
2. Add mobile capture fixture data.
3. Replace `NewContentShell` with mobile-first capture flow.
4. Run typecheck, lint, build, screenshots, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke `/app/content/new` at 390/768/1280/1440 px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `/app/content/new` shows project/rubric selection, one active block, recording states, offline draft, resume, transcript review, assemble action, and compact platform previews.
- Recording controls have visible labels.
- Offline posture disables AI/assemble actions with visible explanation.
- Typecheck/build pass.

## Risks And Recovery

- Static fixture state must be replaced with recorder and local draft storage later.
- Keep changes localized so UI Phase 07 can focus on integrations/publications.

## Status

- 2026-06-20: Started after UI Phase 05 commit and push.
