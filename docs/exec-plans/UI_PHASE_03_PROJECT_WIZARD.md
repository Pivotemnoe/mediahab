# UI Phase 03 — Project Wizard

## Objective

Replace `/app/projects/new` placeholder with a Visual Builder oriented project wizard: setup, audience, tone, platforms, example upload, AI rubric suggestions, and confirmation summary.

## Non-Goals

- No backend mutation wiring.
- No full rubric builder screens.
- No drag-and-drop implementation or extra frontend dependencies.
- No API client/query layer.
- No changes to project data model or migrations.

## Current-State Findings

- `/app/projects/new` renders `NewProjectShell` from `components/phase03/project-builder-shell.tsx`.
- Existing screen is a simple technical form with no real wizard states.
- Canonical UX requires a stepper, autosave posture, AI rubric proposal cards, and no raw JSON by default.
- UI roadmap maps UI Phase 03 specifically to `/app/projects/new`.

## Assumptions And Open Questions

- Use fixture data for project wizard states.
- Keep `MediaHub` / `Медиа-хаб` branding from UI Phase 02.
- API wiring for project creation/import remains a later task.

## Files And Modules

- Add `apps/web/src/features/project-wizard/project-wizard-fixtures.ts`.
- Update `apps/web/src/components/phase03/project-builder-shell.tsx` only where needed for `NewProjectShell`.
- Add Russian UI Phase 03 report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend/docs changes.

## Security And Tenancy Impact

No security-sensitive backend changes. UI must not imply project was saved unless API wiring is added.

## External API And Live-Test Prerequisites

None.

## Implementation Order

1. Add this execution plan.
2. Add project wizard fixture data.
3. Replace `NewProjectShell` with responsive wizard layout.
4. Add report and run verification.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `/app/projects/new` shows stepper, project setup, platform selection, examples block, AI rubric suggestions, and confirmation summary.
- No raw JSON appears in the default UI.
- Typecheck/build pass.

## Risks And Recovery

- Static fixture screen must be replaced with API-backed form state later.
- Keep changes localized so UI Phase 04 can own rubric builder without conflict.

## Status

- 2026-06-20: Started after UI Phase 02 commit and push.
