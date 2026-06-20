# Phase 02 Report — Auth, Workspaces, Billing Skeleton

Дата: 2026-06-20
Статус: завершено локально, ожидает подтверждения перед Phase 03.

## Что сделано

1. Добавлен Phase 02 execution plan: `docs/exec-plans/PHASE_02_AUTH_WORKSPACES_BILLING_SKELETON.md`.
2. Добавлен ADR 0008 про Phase 02 anti-abuse и mock billing.
3. Добавлены SQLAlchemy-модели:
   - `users`
   - `sessions`
   - `email_verification_tokens`
   - `password_reset_tokens`
   - `workspaces`
   - `memberships`
   - `roles`
   - `plans`
   - `prices`
   - `entitlements`
   - `subscriptions`
   - `usage_events`
   - `checkout_sessions`
   - `audit_logs`
4. Добавлена Alembic-миграция `202606200002_phase02_identity_billing.py`.
5. Добавлен idempotent seed для ролей, планов, цен-заглушек и entitlements.
6. Реализованы API routes:
   - `/auth/register`
   - `/auth/login`
   - `/auth/logout`
   - `/auth/logout-all`
   - `/auth/refresh`
   - `/auth/verify-email`
   - `/auth/resend-verification`
   - `/auth/forgot-password`
   - `/auth/reset-password`
   - `/me`
   - `/me/sessions`
   - `/workspaces`
   - `/workspaces/{workspace_id}`
   - `/workspaces/{workspace_id}/members`
   - `/workspaces/{workspace_id}/invitations`
   - `/plans`
   - `/workspaces/{workspace_id}/subscription`
   - `/workspaces/{workspace_id}/usage`
   - `/workspaces/{workspace_id}/checkout`
   - `/workspaces/{workspace_id}/subscription/cancel`
   - `/admin/workspaces/{workspace_id}/assign-plan`
   - `/billing/payments`
   - `/billing/invoices`
7. Добавлены backend-проверки:
   - Argon2id password hash.
   - HttpOnly/SameSite/Secure cookie defaults.
   - CSRF для cookie-authenticated mutations.
   - In-process auth rate limit.
   - Session revocation.
   - Workspace membership scoping.
   - Role denial.
   - Backend entitlement check для `team.seats.max`.
   - Mock checkout без captured payment.
8. Добавлены frontend routes:
   - `/features`
   - `/pricing`
   - `/security`
   - `/contacts`
   - `/login`
   - `/register`
   - `/verify-email`
   - `/forgot-password`
   - `/reset-password`
   - `/terms`
   - `/privacy`
   - `/app/dashboard`
   - `/app/account`
   - `/app/workspace`
   - `/app/billing`
9. Обновлён OpenAPI contract:
   - `packages/contracts/openapi/openapi.json`
   - `apps/web/src/generated-api/openapi.json`
10. Обновлён smoke test под Phase 02 OpenAPI paths.

## Найденные противоречия и открытые вопросы

1. Secure cookies обязательны для production, но локальный Docker работает по HTTP. Решение: default в коде `SESSION_COOKIE_SECURE=true`, в `.env.example` для local стоит `false`.
2. Rate limit в Phase 02 in-process. Для public SaaS или нескольких API-инстансов нужен Redis/shared limiter.
3. Admin plan assignment сейчас использует `ADMIN_API_TOKEN`. Перед public SaaS нужен настоящий system-operator identity.
4. Email verification/reset в Phase 02 используют mock token records. Перед production нужен реальный email provider.
5. Free/Start/Pro/Business limits являются техническими seed-значениями, не финальным коммерческим прайсингом.

## Созданные и изменённые файлы

Ключевые созданные файлы:

- `database/migrations/versions/202606200002_phase02_identity_billing.py`
- `database/seeds/phase02_identity_billing.sql`
- `docs/adr/0008-phase02-auth-abuse-and-mock-billing.md`
- `docs/exec-plans/PHASE_02_AUTH_WORKSPACES_BILLING_SKELETON.md`
- `services/api/app/db/session.py`
- `services/api/app/api/v1/routes/auth.py`
- `services/api/app/api/v1/routes/me.py`
- `services/api/app/api/v1/routes/workspaces.py`
- `services/api/app/api/v1/routes/billing.py`
- `services/api/app/api/v1/routes/admin.py`
- `services/api/app/modules/auth/*`
- `services/api/app/modules/billing/*`
- `services/api/app/modules/shared/*`
- `services/api/tests/test_auth_workspace_billing.py`
- `apps/web/src/components/phase02/*`
- `apps/web/src/app/{features,pricing,security,contacts,login,register,verify-email,forgot-password,reset-password,terms,privacy}/page.tsx`
- `apps/web/src/app/app/{dashboard,account,workspace,billing}/page.tsx`

Ключевые изменённые файлы:

- `.env.example`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/app/page.tsx`
- `apps/web/src/generated-api/openapi.json`
- `packages/contracts/openapi/openapi.json`
- `services/api/app/api/v1/router.py`
- `services/api/app/api/v1/routes/health.py`
- `services/api/app/core/config.py`
- `services/api/app/db/base.py`
- `services/api/app/main.py`
- `services/api/requirements.txt`
- `services/api/pyproject.toml`
- `tools/e2e_smoke.py`
- `tools/seed_baseline.py`
- `docs/OPEN_QUESTIONS.md`
- `reference/OPEN_QUESTIONS.md`

## Результаты тестов и проверок

Предварительно пройдено:

1. `make openapi` — PASS.
2. `make migrate` — PASS, применена миграция `202606200002`.
3. `make seed` — PASS.
4. `make lint` — PASS.
5. `make typecheck` — PASS.
6. `make test` — PASS: 14 тестов.
7. `make test-e2e` — PASS.
8. `make validate-spec` — PASS: `checks=67 files=199 errors=0`.
9. Docker Compose rebuild/restart — PASS through temporary ASCII build context `/private/tmp/media-hub-docker-build`.
10. `curl http://localhost:8100/api/v1/health/ready` — PASS, reports `phase02_identity_billing`.
11. `curl http://localhost:8100/api/v1/plans` — PASS, returns seeded Free/Start/Pro/Business plans.
12. `curl -I http://localhost:3100/register` — PASS, HTTP 200.
13. `curl -I http://localhost:3100/app/billing` — PASS, HTTP 200.

## Решения, требующие подтверждения

1. Подтвердить переход к Phase 03 — Project and Rubric Builder.
2. Подтвердить, что локальные dev-порты остаются текущими.
3. Подтвердить, что для Phase 02 достаточно mock email delivery, а реальный provider выбираем позже.
4. Подтвердить, что Free/Start/Pro/Business seed limits не считаются финальным прайсингом.
5. Подтвердить, что `ADMIN_API_TOKEN` допустим только как временный local/admin skeleton.
