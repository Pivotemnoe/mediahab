# Отчёт Phase 07 — Telegram connector

## Что сделано

Phase 07 переводит Telegram из подготовленного варианта Phase 06 в первичный технический коннектор `telegram_rich_message`.

Добавлен renderer Rich Message: текст и медиа собираются в один payload `sendRichMessage` с `rich_message.html`, блоком `tg-collage`, HTTPS media URLs, порядком медиа из `content_media.sort_order`, TTL delivery URL 24 часа и snapshot evidence в `publication_attempts` / `external_posts`.

Fallback `sendMediaGroup` + отдельный текст реализован только как явно подтверждённый режим: без `fallback_approved=true` destination отклоняется. Silent split запрещён.

Live path к Bot API заложен для `delivery_mode=live`, но live acceptance не считается пройденным без реального бот-токена, безопасного тестового канала и скриншот/evidence.

## Найденные противоречия и открытые вопросы

1. В ранних обсуждениях было сомнение, существует ли `sendRichMessage`. Официальная документация Telegram Bot API от 11 июня 2026 подтверждает Bot API 10.1 Rich Messages, `InputRichMessage`, HTML style, `tg-collage`, `sendRichMessage` и fallback `sendMediaGroup`.
2. Каноническое ТЗ требует live acceptance на fixture `telegram-donika`, но credentials пока не переданы. Поэтому live criterion остаётся pending, а не “пройден”.
3. Timeweb S3 для MVP выбран ранее, но production signed download URL для Telegram ещё нужно проверить на реальной публичной HTTPS-доставке.
4. Текущая реализация не добавляет отдельный secret vault: токен можно передать в техническую конфигурацию, но API responses, attempts и external-post evidence его редактируют. Для production хранение секретов нужно заменить на шифрование/secret storage.
5. Edit/delete behavior для Rich Message заложен как supported по capability, но реальное поведение нужно подтвердить live-тестом на выбранном канале.

## Созданные файлы

- `docs/exec-plans/PHASE_07_TELEGRAM_CONNECTOR.md`
- `docs/exec-plans/PHASE_07_REPORT_RU.md`
- `services/api/tests/test_telegram_connector.py`

## Изменённые файлы

- `apps/web/src/components/phase06/publication-core-shell.tsx`
- `services/api/app/modules/publications/connectors.py`
- `services/api/app/modules/publications/service.py`

## Результаты тестов и проверок

- `.venv/bin/python -m compileall -q services/api/app database/migrations` — прошёл.
- `make openapi` — прошёл, OpenAPI артефакты обновлены.
- `.venv/bin/python -m unittest services.api.tests.test_telegram_connector -v` — прошёл: 3 теста.
- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v` — прошёл: 6 тестов.
- `make typecheck` — прошёл.
- `make lint` — прошёл.
- `make test-e2e` — прошёл.
- `make test` — прошёл: 5 общих тестов и 31 API-тест.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — прошёл: 32 route.
- `make validate-spec` — прошёл: `checks=68 files=317 errors=0`.
- `git diff --check` — прошёл.

## Решения, которые требуют подтверждения

1. Передать Telegram bot token и безопасный тестовый канал, где бот является администратором с правами публикации, редактирования и удаления.
2. Подтвердить live-тест fixture `fixtures/telegram-donika.json` и список клиентов для evidence: Android, iOS, Desktop, Web.
3. Подтвердить финальные Timeweb S3 параметры для публичной HTTPS-доставки Telegram: bucket, public base URL, signed URL TTL, CORS и cleanup.
4. Подтвердить production secret storage для Telegram token до реального публичного запуска.
