# ADR 0004 — Transactional Outbox

Date: 2026-06-20
Status: accepted on 2026-06-20

## Context

Publication must be durable and independent per destination. Redis/Celery transport alone cannot be the source of truth for external publication intent.

## Decision

Creating or scheduling a publication writes both the publication record and an outbox event in the same PostgreSQL transaction. A dispatcher enqueues work to Celery. Workers lock by publication/idempotency key, execute connector calls, persist attempts, and classify retryable errors.

Every retry references the same immutable payload revision. Success on one platform does not roll back failure on another.

## Consequences

- Phase 06 owns the production outbox implementation.
- Connector code must expose idempotency or application-side duplicate guards.
- Tests must simulate worker/Redis restart without losing or duplicating jobs.
