# UI Phase 09 — Billing, Account, Workspace

## Objective

Upgrade billing/account/workspace UI: pricing/current plan/usage/payment placeholder/invoices placeholder/team roles/account settings.

## Non-Goals

- No real payment provider integration.
- No auth/session mutation wiring.
- No member invitation backend flow changes.
- No final hardening/API integration; UI Phase 10 owns that.

## Current-State Findings

- `/app/billing` already has plan, usage and mock checkout posture from Phase 11.
- `/app/account` and `/app/workspace` are generic placeholder pages.
- Canonical UX requires current plan, usage, invoices placeholder, account settings and team roles.

## Assumptions And Open Questions

- Mock payment posture remains explicit until a real provider is approved.
- Team role changes are UI posture only.
- `content.publish` is shown as future granular permission, not currently granted to editor by default.

## Files And Modules

- Add `apps/web/src/features/account-workspace/account-workspace-fixtures.ts`.
- Update `apps/web/src/app/app/billing/page.tsx`.
- Update `apps/web/src/app/app/account/page.tsx`.
- Update `apps/web/src/app/app/workspace/page.tsx`.
- Add Russian UI Phase 09 report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend/docs changes.

## Security And Tenancy Impact

No secrets in fixtures. Security actions are visual posture only until API wiring.

## External API And Live-Test Prerequisites

None.

## Implementation Order

1. Add this execution plan.
2. Add account/workspace fixture data.
3. Upgrade account page.
4. Upgrade workspace page.
5. Adjust billing phase label and payment placeholder language.
6. Run typecheck, lint, build, screenshots, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke `/app/billing`, `/app/account`, `/app/workspace` at 390/768/1280/1440 px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Billing page shows current plan, usage, plans, payment placeholder and invoices placeholder.
- Account page shows profile, email/security, sessions and account settings posture.
- Workspace page shows team roles, seats, permissions and invite posture.
- Typecheck/build pass.

## Risks And Recovery

- Static fixture states must be replaced with real account/workspace/billing APIs later.
- Avoid implying real payment success.

## Status

- 2026-06-20: Started after UI Phase 08 commit and push.
