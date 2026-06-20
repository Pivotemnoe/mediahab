# Отчёт Phase 08 — MAX connector

## Что сделано

Phase 08 переводит MAX из подготовленного варианта в технический коннектор `max_message`.

Добавлен renderer MAX Message: вариант ограничивается 4 000 символами, payload строится для `POST /messages`, формат выбирается из `html` или `markdown`, `chat_id` берётся из destination config, а вложения попадают в evidence как upload/readiness план. MAX token не передаётся в query parameters и не сохраняется в payload logs.

Добавлена симуляция `attachment.not.ready`: публикация получает статус `failed_retryable`, сохраняет retry evidence и использует общий outbox retry-контур. Live path к MAX API заложен для `delivery_mode=live`, но live acceptance остаётся pending без bot token, безопасного `chat_id`, HTTPS webhook и разрешённого mixed-media spike.

Добавлен MAX webhook endpoint `POST /api/v1/webhooks/max/{destination_id}` с проверкой `X-Max-Bot-Api-Secret`, редактированием секрета в evidence и дедупликацией через существующий `webhook_inbox`.

## Найденные противоречия и открытые вопросы

1. В раннем ТЗ MAX рассматривался как prepared/deferred, но Phase 08 требует активный message connector. Реализация теперь использует `max_message`, а не `max_prepared`.
2. MAX media count не зафиксирован как универсальный hard limit. В capability оставлено `unknown_requires_live_spike`, потому что без live-теста нельзя честно заявить лимит для десяти mixed media.
3. Официальные MAX docs на 20 июня 2026 фиксируют, что `GET /chats` больше не поддерживается. Поэтому `chat_id` нужно получать из webhook events или вводить вручную в настройках destination.
4. Webhook secret в docs рекомендуется и поддерживается через `X-Max-Bot-Api-Secret`; нужно подтвердить, делаем ли его обязательным production-требованием для всех MAX destinations.
5. Edit/delete semantics для MAX channel messages пока не подтверждены live evidence.

## Созданные файлы

- `docs/exec-plans/PHASE_08_MAX_CONNECTOR.md`
- `docs/exec-plans/PHASE_08_REPORT_RU.md`
- `services/api/tests/test_max_connector.py`

## Изменённые файлы

- `apps/web/src/components/phase06/publication-core-shell.tsx`
- `docs/OPEN_QUESTIONS.md`
- `services/api/app/api/v1/routes/publications.py`
- `services/api/app/modules/publications/connectors.py`
- `tools/e2e_smoke.py`

## Результаты тестов и проверок

- `.venv/bin/python -m compileall -q services/api/app database/migrations` — прошёл.
- `.venv/bin/python -m unittest services.api.tests.test_max_connector -v` — прошёл: 4 теста.
- `.venv/bin/python -m unittest services.api.tests.test_telegram_connector -v` — прошёл: 3 теста.
- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v` — прошёл: 6 тестов.
- `make openapi` — прошёл, OpenAPI артефакты обновлены.
- `make typecheck` — прошёл.
- `make lint` — прошёл.
- `make test-e2e` — прошёл.
- `make test` — прошёл: 5 общих тестов и 35 API-тестов.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — прошёл: 32 route.
- `make validate-spec` — прошёл: `checks=68 files=320 errors=0`.
- `git diff --check` — прошёл.

## Решения, которые требуют подтверждения

1. Передать MAX bot token и безопасный test channel/chat.
2. Передать `chat_id` для тестового MAX destination или подтвердить способ получения через webhook events.
3. Разрешить MAX live upload/readiness spike для десяти mixed media.
4. Подтвердить, что webhook secret обязателен для production MAX destinations.
5. Подтвердить MAX edit/delete behavior после live-теста.
