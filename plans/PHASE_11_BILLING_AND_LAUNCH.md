# Phase 11 — Billing UI and launch readiness

## Objective

Expose a sellable SaaS shell and complete provider-neutral billing/usage controls without pretending a mock checkout is a real payment integration.

## Deliverables

- Plan comparison, current subscription, usage, limits, upgrade/downgrade intent, and billing-history placeholders.
- Mock checkout and system-admin/manual plan assignment with full audit trail.
- Payment provider interface, Customer/Payment/Invoice/SubscriptionEvent models, webhook inbox, idempotency, and test provider.
- Backend entitlements for projects, rubrics, destinations, AI generations, transcription minutes, storage, team seats, and automatic publication.
- Onboarding, product diagnostics, terms/privacy placeholders, support/contact route, launch checklist, and feature flags.

## Non-goals

- Live recurring charge until the product owner approves provider, legal entity, fiscal receipt, cancellation, refund, and privacy requirements.

## Acceptance

- Free/paid entitlement changes apply server-side and are auditable.
- Mock checkout visibly states that no payment occurred.
- Payment webhook replay is idempotent in tests.
- Public launch remains blocked until security, backup, legal, and real-provider checklists are approved.
