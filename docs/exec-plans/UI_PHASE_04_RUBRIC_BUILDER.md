# UI Phase 04 — Rubric Builder

## Objective

Replace the technical `/app/projects/[projectId]/rubrics` placeholder with a Visual Builder oriented rubric editor: rubric list, dynamic fields, repeatable groups, limits, rules, form preview, and draft/version indicator.

## Non-Goals

- No backend mutations or API client integration.
- No real drag-and-drop implementation.
- No schema editor modal or raw JSON editor by default.
- No changes to database, migrations, or OpenAPI.
- No Content Studio desktop work; that belongs to UI Phase 05.

## Current-State Findings

- `/app/projects/[projectId]/rubrics` renders `RubricBuilderShell` from `components/phase03/project-builder-shell.tsx`.
- The current screen is a compact technical placeholder with palette, canvas, and inspector blocks.
- Canonical UX requires field palette, form canvas, settings inspector, generated fields, repeatable groups, editorial limits, platform strategies, examples, test generation, and version posture.
- UI roadmap maps UI Phase 04 specifically to Rubric Builder.

## Assumptions And Open Questions

- Fixture data is acceptable until the real project/rubric API wiring is added.
- Keep common components generic; project-specific rubrics live only in fixtures.
- The default builder should show a human form preview, not raw schema JSON.

## Files And Modules

- Add `apps/web/src/features/rubric-builder/rubric-builder-fixtures.ts`.
- Update `RubricBuilderShell` in `apps/web/src/components/phase03/project-builder-shell.tsx`.
- Add Russian UI Phase 04 report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend/docs changes.

## Security And Tenancy Impact

No backend changes. UI must not imply that a new rubric version was saved unless API wiring is implemented later.

## External API And Live-Test Prerequisites

None.

## Implementation Order

1. Add this execution plan.
2. Add rubric-builder fixture data.
3. Replace `RubricBuilderShell` with responsive builder layout.
4. Run checks and update validation artifacts.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `/app/projects/[projectId]/rubrics` shows rubric list, field palette, canvas, repeatable groups, inspector, preview, limits, platform strategy, style rules, examples, and test generation posture.
- No raw JSON appears in the default UI.
- Typecheck/build pass.

## Risks And Recovery

- Static fixture screen must be replaced with API-backed rubric CRUD later.
- Keep changes localized so UI Phase 05 can focus on Content Studio without layout churn.

## Status

- 2026-06-20: Started after UI Phase 03 commit and push.
