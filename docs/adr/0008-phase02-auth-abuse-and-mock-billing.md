# ADR 0008 — Phase 02 Auth Abuse Controls And Mock Billing

Date: 2026-06-20
Status: accepted for Phase 02 implementation

## Context

ADR 0002 already selects server-side browser sessions with Argon2id, HttpOnly cookies, CSRF protection, and auth rate limits. Phase 02 needs a concrete MVP implementation that is testable locally without pretending to be production-grade billing or anti-abuse infrastructure.

## Decision

Use opaque session cookies backed by hashed session tokens in PostgreSQL. Store a hashed CSRF token with each session and require a matching `X-CSRF-Token` header plus readable CSRF cookie for cookie-authenticated mutations.

Use an in-process sliding-window rate limiter for auth endpoints in Phase 02. It is enough for local tests and first skeleton behavior, but it is explicitly not the final SaaS abuse-control layer.

Seed editable Free, Start, Pro, and Business plans with entitlements. Use `MockPaymentProvider` semantics for checkout: the API may create a pending/manual-contact checkout state, but must always return `payment_captured=false`.

Admin plan assignment uses a local operator token setting until a dedicated system-operator user model is implemented.

## Alternatives Considered

- Browser bearer tokens in localStorage: rejected by ADR 0002 and higher XSS impact.
- Redis-backed rate limiting immediately: deferred because Phase 02 is the identity skeleton and runs as one local API instance.
- Fake successful payment: rejected because it would mislead the UI and contradict the billing specification.

## Consequences

- Tests can assert cookie flags, CSRF rejection, throttling, revoked-session rejection, tenant isolation, role denial, and mock checkout honesty.
- Production deployment must keep secure cookies enabled and replace the in-process limiter with a shared limiter before public SaaS launch.
- Billing UI can show available plans and pending checkout/manual-contact state without claiming money moved.

## Migration And Rollback

The Phase 02 migration adds session, token, role, workspace, billing, usage, checkout, and audit tables. Rollback drops those tables and does not modify Phase 01 baseline data.

## Evidence

Phase 02 acceptance requires `make test`, `make migrate`, `make seed`, `make openapi`, `make lint`, `make typecheck`, `make test-e2e`, and `make validate-spec` to pass.
