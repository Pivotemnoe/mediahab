# UI Phase 11K — отчёт

## Что сделано

- Исправлен сбой пилотного сценария, где после принятия диктовок блок `ИИ-сборка и версии` показывал `OpenAI text generation returned HTTP 400`.
- Для `extract_facts` добавлена отдельная OpenAI-safe schema: модель получает закрытую `facts[]`-структуру вместо произвольного JSON object.
- Ответ `extract_facts` нормализуется обратно в прежний API-формат `response_json.facts` как object, поэтому frontend-контракт не менялся.
- Для `assemble_master` добавлен fallback: если text provider возвращает ошибку, backend создаёт мастер-ревизию из принятых пользовательских блоков и добавляет предупреждение `ai_provider_fallback`.
- Существующий fallback при конфликте зафиксированных фактов сохранён.

## Проверки

- `python3 -m unittest services.api.tests.test_ai_examples_pipeline` — не запускался без `.venv`, потому что системный Python не видит FastAPI.
- `.venv/bin/python -m unittest services.api.tests.test_ai_examples_pipeline` — пройдено, 5 тестов.
- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройдено.
- `make test` — пройдено: UI hardening checks, 5 общих unittest, 45 API unittest.

## Источники

- Production logs подтвердили: OpenAI STT вернул `200`, accepted transcription прошёл, content blocks обновились, а сбой появился позже на OpenAI `/v1/responses`.
- Официальная документация OpenAI Structured Outputs требует `additionalProperties: false` для object-схем и `required` для всех полей strict output.

## Миграции

- Миграции не добавлялись.
- OpenAPI и typed frontend client не менялись, потому что внешний API-контракт не менялся.

## Ограничения

- Это исправляет блокирующий HTTP 400 на strict fact extraction и добавляет source fallback для мастера.
- Если OpenAI вернёт другой тип ошибки, пользователь всё равно сможет получить fallback-мастер, но качество редакторской переработки будет ниже до повторной успешной AI-сборки.

## Следующий шаг

- После деплоя проверить на production: на уже созданном материале повторно нажать `Собрать мастер и первую версию`; красная OpenAI 400 ошибка не должна блокировать сборку.
