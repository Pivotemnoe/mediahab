# UI Phase 02 — Landing, Auth, Dashboard

## Objective

Replace Phase 02 placeholder public/auth/dashboard screens with Russian, fixture-driven UI aligned with the Editorial Studio baseline from the UI reference pack: useful landing, pricing continuity, auth flows, and dashboard states.

## Non-Goals

- No backend contract changes.
- No real form submission wiring beyond existing route shells.
- No Playwright dependency addition.
- No project wizard, rubric builder, content studio, integrations, publications, or billing/account/workspace completion beyond existing screens.
- No dark Command Center theme.

## Current-State Findings

- UI Phase 01 already added the shell, layout, primitives, navigation, and showcase baseline.
- Public pages use a generic `PublicPage` placeholder.
- Auth pages use `AuthPage`, but copy is technical and does not feel like a product screen.
- `/app` dashboard already has cards and usage meter but reads as a phase status page, not a workspace dashboard.
- The UI reference pack includes `design/ui-reference/assets/donika-telegram.jpeg`, which can serve as a relevant landing visual asset.

## Assumptions And Open Questions

- Keep the visible working product name as `MediaHub` / `Медиа-хаб` until the product-owner confirms final naming.
- Use static fixtures for dashboard data in UI Phase 02.
- Keep forms visually complete but non-submitting until API client integration is scheduled.
- Playwright visual baselines are still deferred because the dependency has not been approved.

## Files And Modules

- Add/copy public visual asset under `apps/web/public/assets/`.
- Add `apps/web/src/features/dashboard/dashboard-fixtures.ts`.
- Update `apps/web/src/app/page.tsx`, `/features`, `/contacts`, `/pricing` if needed.
- Update auth pages and `components/phase02/auth-page.tsx`.
- Update `/app` dashboard.
- Add Russian UI Phase 02 report.

## Database Migration And Rollback

No database migration. Rollback is reverting frontend/docs changes.

## Security And Tenancy Impact

No security-sensitive backend behavior changes. Auth screens must not imply successful login/registration without API confirmation.

## External API And Live-Test Prerequisites

None. Screens are fixture/static in this phase.

## Implementation Order

1. Add this execution plan.
2. Copy the UI reference visual asset into public assets.
3. Add dashboard fixtures.
4. Replace landing/features/contacts page placeholders with product-facing Russian pages.
5. Replace auth page copy/layout with usable Russian forms and states.
6. Replace dashboard phase-status cards with workspace, draft, schedule, integration, and usage fixtures.
7. Write report and run verification.

## Tests And Commands

- `make typecheck`
- `make lint`
- `make test-e2e`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Landing uses a relevant bitmap visual asset and Russian product copy.
- Auth screens have complete field states, labels, secondary actions, and do not describe internal API implementation.
- Dashboard shows realistic project, drafts, scheduled publications, integration alerts, and plan usage.
- Frontend typecheck/build pass.

## Risks And Recovery

- The visual asset is a reference placeholder, not final brand photography.
- Static forms may need replacement once API client integration starts.
- Keep UI edits scoped so later UI phases can replace individual feature screens without large refactors.

## Status

- 2026-06-20: Started after Product Phase 11 billing launch-readiness commit and push.
- 2026-06-20: Implemented landing, auth, dashboard fixtures/screens, Russian brand defaults, visual smoke screenshots, and checks through `make validate-spec` and `git diff --check`.
