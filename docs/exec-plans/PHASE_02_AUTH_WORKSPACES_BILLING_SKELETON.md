# Phase 02 — Authentication, Workspaces, Billing Skeleton

## Objective

Implement the SaaS identity boundary before project/content data is introduced: email/password auth, revocable cookie sessions, workspace membership/roles, backend entitlement checks, mock billing state, and the public/account/workspace/billing route shell.

## Non-Goals

- Real payment capture or real payment provider webhooks.
- Full team invitation UX.
- Project, rubric, content, AI, media, or publication business flows.
- PostgreSQL RLS; it remains a hardening-phase defense-in-depth layer.

## Current-State Findings

- Phase 01 has a working FastAPI skeleton, Next.js shell, Alembic baseline, Docker Compose stack, and OpenAPI export.
- No database session dependency exists yet.
- No authenticated routes or tenant models exist.
- The frontend currently has only `/` and `/app` technical pages.

## Assumptions And Open Questions

- Local development keeps the current non-default ports: web `3100`, API `8100`, Postgres `55434`, Redis `6380`, MinIO `9100/9101`.
- Secure cookies are the default. Local Docker may override `SESSION_COOKIE_SECURE=false` only because it runs over plain HTTP.
- Mock payment must never report captured money.
- Admin plan assignment uses a local operator token until a proper system-operator identity model is added.

## Files And Modules

- Add API modules under `services/api/app/modules/{auth,workspaces,billing,audit,shared}`.
- Add route modules for `/auth`, `/me`, `/workspaces`, `/plans`, `/billing`, and `/admin`.
- Extend `services/api/app/db` with SQLAlchemy models and async session dependency.
- Add Alembic revision `202606200002_phase02_identity_billing.py`.
- Add Phase 02 seed SQL for roles, plans, prices, and entitlements.
- Add frontend routes for public SaaS pages and account/workspace/billing placeholders.
- Add security and authorization tests under `services/api/tests`.

## Database Migration And Rollback

- Upgrade creates identity, session, workspace, membership, role, billing, usage, checkout, token, and audit tables.
- Downgrade drops Phase 02 tables in reverse dependency order and leaves the Phase 01 marker intact.
- Seed is idempotent and uses stable UUIDs for editable plan records.

## Security And Tenancy Impact

- Passwords use Argon2id hashes.
- Session cookies are HttpOnly, SameSite=Lax, and Secure by default.
- Cookie-authenticated mutations require a double-submit CSRF token.
- Auth endpoints have an in-process rate limiter suitable for local/MVP use; distributed Redis rate limiting is deferred.
- Workspace access checks return `404` for inaccessible workspace IDs.
- Role checks return `403` for known workspace members without sufficient privileges.
- Entitlement checks are performed by backend services, not frontend visibility.

## External API And Live-Test Prerequisites

No external auth, payment, social, or email provider is used in Phase 02. Email verification and reset use mock token records suitable for local/manual testing.

## Implementation Order

1. Add execution plan, ADR, requirements, and settings.
2. Add ORM models, database session dependency, and Alembic revision.
3. Implement security helpers, auth dependencies, services, and routes.
4. Implement workspace authorization and billing entitlement resolver.
5. Add public/auth/account/workspace/billing frontend route shell.
6. Generate OpenAPI and update frontend generated contract.
7. Add tests for cookies, CSRF, rate limiting, revoked sessions, role denial, tenant isolation, and mock billing.
8. Run migrations, seed, tests, lint/typecheck/e2e/spec validation.
9. Write the Russian Phase 02 report.

## Tests And Checks

- Unit/integration: FastAPI auth and workspace/billing flows against a temporary test database.
- Contract: regenerated OpenAPI committed to both contract locations.
- E2E smoke: existing web/API/OpenAPI smoke remains passing.
- Security assertions: cookie flags, password hash format, CSRF rejection, rate-limit response, revoked session rejection, role denial.
- Migration/seed: `make migrate` and `make seed` against local Docker Postgres.

## Demo And Acceptance Evidence

- Public SaaS routes render.
- `/app/account`, `/app/workspace`, and `/app/billing` render placeholders tied to Phase 02.
- Register creates a user, owner workspace, owner membership, Free subscription, session, and CSRF token.
- Free-plan entitlement denies adding extra members.
- Mock checkout returns pending/manual-contact state and `payment_captured=false`.

## Risks And Recovery

- Secure cookies over plain local HTTP require a dev override. Production/staging must keep Secure cookies enabled.
- The in-process rate limiter resets on API restart and is not sufficient for multi-instance SaaS; replace with Redis before public launch.
- Mock tokens are acceptable for local verification/reset only; real email delivery adapter is needed before production.

## Status

- 2026-06-20: Started after user approval to continue past Phase 01.
- 2026-06-20: Completed locally; Phase 03 requires product-owner confirmation.
