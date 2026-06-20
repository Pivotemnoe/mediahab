# UI Phase 01 — Design System And Shells

## Objective

Create the first durable frontend foundation from the UI reference pack without rebuilding all product screens:

- centralized brand configuration;
- CSS variables and Tailwind semantic design tokens;
- shared application shells for marketing, auth, and cabinet;
- desktop sidebar, topbar, mobile navigation, and page header;
- reusable state components;
- a component showcase route for visual smoke checks;
- migration of existing technical phase pages into the new cabinet shell while preserving URLs and backend contracts.

## Non-Goals

- Do not implement full landing, auth redesign, project wizard, rubric builder, content studio, mobile PWA, or publication operations UI.
- Do not start Product Phase 07 Telegram connector.
- Do not change backend API contracts or database schema.
- Do not copy standalone reference HTML into production components.
- Do not hardcode the “Что поесть? Армавир” preset or PostHub naming in generic components.
- Do not add heavy form/query/drag dependencies in this phase unless needed for shell work.

## Current-State Findings

- Product Phase 06 is complete and pushed.
- UI Phase 00 added `design/ui-reference/` and `docs/frontend/*`.
- Existing frontend is a technical phase shell with minimal primitives.
- Existing routes must remain stable.
- Current visible product name is "Медиа-хаб"; UI reference recommends configurable "Temichev PostHub" / "PostHub".

## Assumptions And Open Questions

- Use configurable brand defaults from UI Phase 00. Default to "PostHub" in config, but keep Russian metadata/copy where existing pages need it.
- No new production backend dependency is needed.
- Playwright is desirable for visual tests, but this phase can use browser/runtime smoke and document that Playwright dependency remains pending if it is not already available.
- Command Center dark mode remains deferred.

## Files And Modules

Create:

- `apps/web/src/config/brand.ts`
- `apps/web/src/config/navigation.ts`
- `apps/web/src/components/layout/*`
- `apps/web/src/components/states/*`
- `apps/web/src/app/app/showcase/page.tsx`
- `docs/exec-plans/UI_PHASE_01_REPORT_RU.md`

Update:

- `apps/web/src/app/globals.css`
- `apps/web/tailwind.config.ts`
- `apps/web/src/app/layout.tsx`
- existing `apps/web/src/app/app/**/page.tsx` wrappers where needed;
- existing `apps/web/src/components/ui/*`.

## Database Migration And Rollback

No database migration. UI Phase 01 changes only frontend and documentation.

Rollback:

- Remove new layout/state/showcase components.
- Revert Tailwind/global token updates.
- Restore old route page wrappers.

## Security And Tenancy Impact

- No auth/session/backend security behavior changes.
- Brand config reads only public `NEXT_PUBLIC_*` values.
- Shell/navigation must not imply access to features not authorized by backend; feature pages remain responsible for API authorization.

## Implementation Order

1. Add brand and navigation config.
2. Convert CSS/Tailwind tokens to semantic variables while keeping compatibility aliases.
3. Expand UI primitives and state components.
4. Add MarketingShell, AuthShell, CabinetShell, Sidebar, Topbar, MobileNav, PageHeader.
5. Wrap existing cabinet routes in the new shell with stable URLs.
6. Add component showcase route.
7. Run typecheck, lint, tests, e2e smoke, and runtime/screenshot checks where available.
8. Write Russian report and stop before UI Phase 02 or Product Phase 07.

## Tests And Checks

- `make typecheck`
- `make lint`
- `make test`
- `make test-e2e`
- `make validate-spec`
- `git diff --check`
- Runtime smoke for `/`, `/login`, `/app`, `/app/showcase`, `/app/publications`.
- Visual evidence at 390, 768, 1280, and 1440 widths if browser automation is available.

## Demo And Acceptance Evidence

- Existing Phase 06 pages still render.
- New cabinet shell provides sidebar/topbar/mobile nav.
- Component showcase demonstrates brand, tokens, buttons, badges, cards, states, and usage meter.
- No product screen claims final visual completion.

## Risks And Recovery

- Risk: shell refactor could break route rendering. Mitigation: keep page content wrappers thin and verify key routes.
- Risk: visual density could drift from reference pack. Mitigation: tokenize first and keep Editorial Studio as default.
- Risk: too much UI work before connectors. Mitigation: restrict this phase to shell/design foundation.

## Status

- 2026-06-20: Started after owner confirmation to continue with the next planned UI phase.
- 2026-06-20: Implemented design tokens, shells, navigation, states, showcase, route integration, runtime smoke, screenshots, and Russian report.
