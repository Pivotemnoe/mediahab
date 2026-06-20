# Codex Task — UI Phase 00: Plan and Foundation Review

## Goal

Read the main repository specification and the entire UI reference pack. Produce an implementation-ready frontend plan without building product screens yet.

## Required inputs

1. Repository root `AGENTS.md`.
2. Canonical English product specification.
3. `design/ui-reference/00_START_HERE_EN.md`.
4. All files in `design/ui-reference/docs/`.
5. The four HTML concepts and PNG references.

## Work

1. Inspect the existing frontend repository structure and dependencies.
2. Identify conflicts between the main specification and UI references.
3. Propose the final route map.
4. Propose the component hierarchy.
5. Propose the design token model.
6. Define the mock service layer and fixture strategy.
7. Define state boundaries for server data, local drafts, forms, and publication status.
8. Define desktop/mobile responsive behavior.
9. Define Playwright visual verification viewports and scripts.
10. Define the exact deliverables for UI Phase 01.

## Constraints

- Do not implement the full UI.
- Do not add production dependencies without approval.
- Do not copy standalone reference HTML into the application.
- Do not hard-code PostHub naming or project-specific rubrics.
- Do not change backend contracts unless a documented conflict exists.

## Deliverables

Create or update:

```text
docs/frontend/UI_ARCHITECTURE.md
docs/frontend/ROUTE_MAP.md
docs/frontend/COMPONENT_MAP.md
docs/frontend/DESIGN_TOKENS.md
docs/frontend/MOCK_DATA_STRATEGY.md
docs/frontend/VISUAL_TEST_PLAN.md
```

## Completion report

Return in Russian:

1. summary;
2. conflicts and open questions;
3. files created or changed;
4. commands and checks run;
5. proposed UI Phase 01 scope;
6. explicit stop and request for approval.
