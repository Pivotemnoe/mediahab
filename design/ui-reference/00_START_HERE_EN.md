# PostHub UI Reference Pack — Start Here

## Purpose

This package is a visual and UX implementation brief for the PostHub frontend. It is not a production frontend and it does not replace the main product specification.

Use it inside the main repository as `design/ui-reference/`.

## Working product name

- Working full name: **Temichev PostHub**
- Short UI name: **PostHub**
- Optional endorsement: **by Temichev**

Treat the name as configurable. Do not hard-code it across components. Use a central brand configuration and environment variables.

## Canonical UI direction

Build one coherent product from these references:

1. **Editorial Studio** — primary desktop shell, navigation, dashboard, and content studio.
2. **Visual Builder** — project builder, rubric builder, field schema, rules, examples, and limits.
3. **Mobile-first PWA** — field workflow, voice capture, step-by-step input, review, and publish.
4. **Command Center** — later reference for dark mode, operations, publication queue, and analytics.

Do not implement four separate themes.

## How to use the references

- Open `index.html` to browse all interactive concepts.
- Use HTML files for layout and interaction reference only.
- Use PNG files as visual targets for Codex and Playwright screenshot comparison.
- Do not copy the standalone HTML into production.
- Implement the UI with the repository's Next.js, React, TypeScript, Tailwind CSS, and shadcn/ui stack.

## Required workflow

1. Read the repository root `AGENTS.md` and the main product specification.
2. Read this file and all documents in `docs/`.
3. Execute only `codex/UI_PHASE_00_PLAN_EN.md` first.
4. Do not implement later phases without explicit approval.
5. At the end of each phase, provide:
   - changed files;
   - screenshots at required viewports;
   - test and lint results;
   - unresolved decisions;
   - a short report in Russian.

## Product experience target

The core flow is:

```text
Project → Rubric → Voice/Text Input → AI Editor → Platform Variants → Validation → Publish
```

The product must feel like a focused content studio, not a generic enterprise CRM and not a basic cross-posting form.

## Non-negotiable principles

- Mobile voice capture is a first-class workflow.
- Projects, rubrics, fields, rules, limits, examples, and templates are dynamic data.
- The content editor must show platform-specific previews and character budgets.
- AI-generated fields must be visibly marked and editable.
- User-entered facts must be lockable and must not be silently changed.
- All backend-dependent UI must support mocked service adapters before live integration.
- Include loading, empty, error, offline, permission, and limit-reached states.
- Meet responsive and accessibility acceptance criteria.

## Next documents

Read in this order:

1. `docs/PRODUCT_NAMING_AND_BRAND_EN.md`
2. `docs/UI_PRODUCT_DIRECTION_EN.md`
3. `docs/SCREEN_MAP_AND_FLOWS_EN.md`
4. `docs/DESIGN_SYSTEM_EN.md`
5. `docs/UI_IMPLEMENTATION_ROADMAP_EN.md`
6. `docs/UI_ACCEPTANCE_CHECKLIST_EN.md`
7. `codex/UI_PHASE_00_PLAN_EN.md`
