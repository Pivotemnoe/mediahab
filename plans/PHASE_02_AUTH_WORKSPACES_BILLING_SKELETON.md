# Phase 02 — Authentication, workspaces, and billing skeleton

## Objective

Establish the SaaS identity boundary, secure cabinet access, roles, and backend-enforced entitlements before tenant data is introduced.

## Deliverables

- Registration, email verification adapter, login, logout, forgot/reset password, and session revocation.
- Argon2id password hashing; Secure HttpOnly SameSite cookies; CSRF protection where required; rate limiting and abuse-safe error messages.
- User, Session, Workspace, Membership, Role, Plan, Price, Entitlement, Subscription, UsageEvent, and AuditLog migrations.
- Owner workspace created during onboarding.
- Backend authorization service and route dependencies.
- Public landing, features, pricing, login/register, account, workspace, and billing placeholder routes.
- Free/default plan seed and mock/admin subscription assignment.

## Non-goals

- Real payment capture.
- Team invitation UI beyond the minimum needed to test role data.

## Acceptance

- Cross-workspace identifiers do not expose or mutate another tenant’s data.
- Revoked sessions stop working.
- Subscription limits are checked on the backend, not only hidden in the UI.
- The mock payment state never claims money was captured.
- Security tests cover cookie flags, rate limits, password handling, CSRF, and role denial.
