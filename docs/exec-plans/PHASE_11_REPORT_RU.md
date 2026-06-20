# Отчёт Phase 11 — billing UI and launch readiness

## Что сделано

Phase 11 выполнена как честный billing/launch-readiness слой без подключения реальных платежей.

Добавлены provider-neutral billing models: `payment_customers`, `payments`, `invoices`, `subscription_events`, `payment_webhook_inbox`. Для них добавлена миграция `202606200008_phase11_billing_launch.py`.

Добавлен `MockPaymentProvider`: checkout создаёт только `pending_manual_contact`, `payment_captured=false`, без настоящего списания. Mock webhook может симулировать применение тарифа для тестов, но также сохраняет `payment_captured=false`.

Расширен backend:

- usage endpoint теперь возвращает `usage`, `entitlements` и список `limits` со статусами;
- admin manual plan assignment создаёт `subscription_event` и audit log;
- owner cancellation создаёт `subscription_event` и audit log;
- payment webhook сохраняется в durable inbox, проверяет mock signature, редактирует безопасные headers без секретов и идемпотентно игнорирует повторный `event_id`;
- `/billing/payments` и `/billing/invoices` возвращают mock/evidence records только по рабочим пространствам текущего пользователя.

Обновлены русские экраны `/pricing` и `/app/billing`: теперь они показывают тарифы, лимиты, mock checkout, историю mock-платежей/счетов и явный production blocker для live billing.

## Найденные противоречия и открытые вопросы

1. ТЗ требует подготовить real provider interface, но запрещает реальную оплату до коммерческих/юридических решений. Реализован только `MockPaymentProvider`; live provider оставлен заблокированным.
2. В раннем Phase 02 уже были базовые billing таблицы, но не было канонических `payments/invoices/subscription_events/payment_customers` и payment webhook inbox.
3. Цены и квоты в seed являются редактируемыми тестовыми значениями, а не финальными коммерческими условиями.
4. Mock webhook меняет тариф как симуляция/ручная операция, но не должен трактоваться как успешная реальная оплата.

## Созданные файлы

- `database/migrations/versions/202606200008_phase11_billing_launch.py`
- `docs/exec-plans/PHASE_11_BILLING_AND_LAUNCH.md`
- `docs/exec-plans/PHASE_11_REPORT_RU.md`
- `services/api/app/modules/billing/providers.py`

## Изменённые файлы

- `apps/web/src/app/app/billing/page.tsx`
- `apps/web/src/app/pricing/page.tsx`
- `apps/web/src/generated-api/openapi.json`
- `docs/OPEN_QUESTIONS.md`
- `packages/contracts/openapi/openapi.json`
- `services/api/app/api/v1/routes/admin.py`
- `services/api/app/api/v1/routes/billing.py`
- `services/api/app/core/config.py`
- `services/api/app/db/base.py`
- `services/api/app/modules/billing/catalog.py`
- `services/api/app/modules/billing/service.py`
- `services/api/tests/test_auth_workspace_billing.py`
- `tools/e2e_smoke.py`

## Результаты тестов и проверок

- `.venv/bin/python -m compileall -q services/api/app services/api/tests` — прошёл.
- `.venv/bin/python -m unittest services.api.tests.test_auth_workspace_billing -v` — прошёл: 9 тестов.
- `make openapi` — прошёл, OpenAPI artefacts обновлены.
- `make typecheck` — прошёл.
- `make test-e2e` — прошёл.
- `make lint` — прошёл.
- `make test` — прошёл: 5 общих тестов и 42 API-теста.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — прошёл, собрано 32 routes.
- `make validate-spec` — прошёл: checks=68, files=332, errors=0.
- `git diff --check` — прошёл без замечаний.

## Решения, которые требуют подтверждения

1. Выбрать реального провайдера оплаты или подтвердить ручные счета как первый production billing.
2. Подтвердить юридическое лицо, чеки, налоги, refund/cancellation policy, публичную оферту и privacy wording.
3. Подтвердить финальные цены, квоты, trial/overage правила и политику ручного назначения тарифов.
4. Подтвердить, можно ли оставлять mock payment webhook в staging после подключения live provider.
