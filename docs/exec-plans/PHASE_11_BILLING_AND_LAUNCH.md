# Phase 11 — Billing UI And Launch Readiness

## Objective

Complete the provider-neutral billing MVP slice required for launch readiness: plan comparison, subscription and usage snapshots, mock checkout, admin/manual plan assignment auditability, payment provider abstraction, durable payment webhook inbox, idempotent replay handling, and honest Russian billing UI.

## Non-Goals

- Live recurring payments.
- YooKassa, CloudPayments, Stripe, fiscal receipts, refunds, cancellations, or legal documents finalization.
- Final commercial prices hardcoded in the repository.
- Full public SaaS launch approval. Security, backup, legal, RLS, and real payment provider checklists remain blockers.

## Current-State Findings

- Phase 02 already created `plans`, `prices`, `entitlements`, `subscriptions`, `usage_events`, `checkout_sessions`, and basic billing routes.
- Existing checkout is a mock/manual-contact placeholder and correctly does not capture payment.
- Missing canonical billing tables: `payment_customers`, `payments`, `invoices`, and `subscription_events`.
- Missing durable payment webhook inbox and idempotent webhook processing.
- Existing `/app/billing` and `/pricing` pages are Phase 02 placeholders, not a launch-readiness billing surface.
- Free-plan project and team-seat limits are already enforced in representative backend paths.

## Assumptions And Open Questions

- `MockPaymentProvider` remains the only enabled provider in Phase 11.
- A mock webhook may simulate plan activation for tests and manual operations, but `payment_captured` must remain `false`.
- System-admin plan assignment uses the existing `X-Admin-Token` mechanism until a real system admin UI exists.
- Real provider selection, legal entity, receipts, refunds, public offer, privacy wording, and cancellation rules require product-owner approval before live payments.

## Files And Modules

- Extend `services/api/app/db/base.py` with provider-neutral billing models.
- Add `services/api/app/modules/billing/providers.py`.
- Extend `services/api/app/modules/billing/service.py` with usage snapshots, checkout creation, audit/event helpers, and mock webhook processing.
- Extend `services/api/app/api/v1/routes/billing.py` and `routes/admin.py`.
- Add Alembic migration `database/migrations/versions/202606200008_phase11_billing_launch.py`.
- Extend billing tests in `services/api/tests/test_auth_workspace_billing.py`.
- Update `/app/billing`, `/pricing`, OpenAPI exports, smoke checks, open questions, and Russian Phase 11 report.

## Database Migration And Rollback

Migration adds only new billing tables. Rollback drops the new tables in dependency order. Existing billing tables and subscriptions remain untouched.

## Security And Tenancy Impact

- Billing reads are scoped to workspaces where the actor has membership.
- Checkout and cancellation remain owner-only.
- Admin plan assignment remains token-protected and must create audit/subscription-event evidence.
- Payment webhook processing verifies the mock signature, stores durable inbox evidence, and handles duplicate `event_id` replays idempotently.
- No credentials, authorization headers, cookies, or webhook secrets are stored.

## External API And Live-Test Prerequisites

No external payment API is called in Phase 11. Real-provider integration requires provider approval, webhook signing documentation, fiscal/legal requirements, and a separate live-test plan.

## Implementation Order

1. Add this execution plan.
2. Add billing models and migration.
3. Add `MockPaymentProvider` abstraction.
4. Move checkout/audit/webhook/idempotency behavior into billing service helpers.
5. Extend billing/admin routes and OpenAPI smoke coverage.
6. Extend tests for mock checkout, admin assignment audit, usage limits, webhook replay, payments, and invoices.
7. Replace billing/pricing placeholder UI with Russian technical billing shell.
8. Write report and run verification.

## Tests And Commands

- `.venv/bin/python -m unittest services.api.tests.test_auth_workspace_billing -v`
- `.venv/bin/python -m compileall -q services/api/app services/api/tests`
- `make openapi`
- `make typecheck`
- `make lint`
- `make test-e2e`
- `make test`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Mock checkout visibly returns no captured payment.
- Admin/manual plan assignment changes server-side entitlements and creates audit/subscription-event evidence.
- Mock payment webhook replay is idempotent and does not duplicate subscription/payment/invoice effects.
- Billing usage response includes current usage, entitlements, and limit statuses.
- Public launch remains blocked in docs until real payment, security, backup, legal, and RLS decisions are approved.

## Risks And Recovery

- Mock webhook semantics must not be mistaken for live payment success; UI and API messages keep explicit wording.
- Provider-specific fields may need migration once YooKassa/CloudPayments is selected.
- If tests expose existing assumptions around billing response shapes, keep backwards-compatible fields and add new ones rather than replacing old contracts.

## Status

- 2026-06-20: Started after Phase 10 scheduling/PWA commit and push.
- 2026-06-20: Implemented provider-neutral billing models, mock provider/webhook idempotency, billing API, Russian billing/pricing UI, and checks through `make validate-spec` and `git diff --check`.
