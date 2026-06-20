# Отчёт Phase 06 — публикационное ядро

## Что сделано

Phase 06 добавляет технический публикационный контур до нативных соцсетевых коннекторов: неизменяемые варианты под площадки, capability registry, validate/approve, project destinations, публикации, попытки, external post records, webhook inbox и PostgreSQL-backed outbox.

Нативные Telegram/MAX/Instagram API не используются. Для проверки доставки в этой фазе есть ручной экспорт и симулируемый generic webhook.

Фронтенд остаётся русской технической оболочкой: `/app/publications` показывает варианты, approval, destinations, статусы очереди, attempts, retry и manual package. Это не финальный визуальный дизайн.

## Найденные противоречия и открытые вопросы

1. ТЗ требует durable publication pipeline на Celery/Redis, но также фиксирует PostgreSQL transactional outbox как source of truth. В Phase 06 реализован durable outbox и inline dispatcher для тестируемого vertical slice; production worker polling/locking остаётся открытым решением.
2. Generic webhook по ТЗ должен уметь signed JSON и SSRF protection. В Phase 06 live outbound HTTP не выполняется, доставка симулируется через `simulate_status`; перед live-режимом нужно подтвердить staging target, DNS-resolution policy и DNS-rebinding защиту.
3. Ручной экспорт в Phase 06 переводит публикацию в `manual_required`, а не в финальное `published`, потому что внешняя публикация человеком ещё не подтверждена.
4. В техническом slice редакторы могут создавать/approve/queue публикации. Финальная production-модель прав публикации требует подтверждения владельца продукта.
5. Telegram/MAX/Instagram variants создаются и валидируются по hard limits, но нативная отправка остаётся для Phase 07/08/09.
6. Сроки хранения publication payloads, attempts, webhook evidence и manual export packages пока не финализированы.

## Созданные файлы

- `apps/web/src/components/phase06/publication-core-shell.tsx`
- `database/migrations/versions/202606200006_phase06_publication_core.py`
- `docs/adr/0013-publication-core-outbox-and-connectors.md`
- `docs/exec-plans/PHASE_06_PUBLICATION_CORE.md`
- `docs/exec-plans/PHASE_06_REPORT_RU.md`
- `services/api/app/api/v1/routes/publications.py`
- `services/api/app/modules/publications/__init__.py`
- `services/api/app/modules/publications/connectors.py`
- `services/api/app/modules/publications/service.py`
- `services/api/tests/test_publication_core.py`

## Изменённые файлы

- `apps/web/src/app/app/page.tsx`
- `apps/web/src/app/app/publications/page.tsx`
- `apps/web/src/generated-api/openapi.json`
- `docs/OPEN_QUESTIONS.md`
- `docs/adr/README.md`
- `packages/contracts/openapi/openapi.json`
- `reference/OPEN_QUESTIONS.md`
- `services/api/app/api/v1/router.py`
- `services/api/app/api/v1/routes/health.py`
- `services/api/app/db/base.py`
- `tools/e2e_smoke.py`

## Результаты тестов и проверок

- `.venv/bin/python -m compileall -q services/api/app database/migrations` — прошёл.
- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v` — прошёл: 5 тестов.
- `make openapi` — прошёл, OpenAPI обновлён.
- `make test-e2e` — прошёл: Phase 06 publication core paths найдены.
- `make typecheck` — прошёл.
- `make lint` — прошёл.
- `make test` — прошёл: 5 общих тестов и 27 API-тестов.
- `make migrate` — прошёл: применена миграция `202606200006`.
- `make seed` — прошёл.
- `make validate-spec` — прошёл: `checks=67 files=253 errors=0`.
- `git diff --check` — прошёл.
- Docker runtime smoke — прошёл после прямой сборки образов `media-hub-api`, `media-hub-worker`, `media-hub-web` и запуска `docker compose -p media-hub up -d --no-build`: API readiness показывает `phase06_publication_core`, live OpenAPI содержит `/api/v1/publications/{publication_id}/publish-now`, всего 102 path, `/app/publications` отдаёт `200`.

## Технические замечания по сборке

- `docker compose -p media-hub up --build -d` в текущем окружении упал на BuildKit/bake gRPC header. Обход: `docker build` для backend/web образов и `docker compose -p media-hub up -d --no-build`.

## Решения, которые требуют подтверждения

1. Подтвердить production worker polling/locking для обработки `outbox_events` через Celery.
2. Подтвердить, когда generic webhook переходит от симуляции к live outbound HTTP.
3. Подтвердить DNS/SSRF policy для generic webhook перед live outbound.
4. Подтвердить, могут ли редакторы публиковать в production или публикация только owner/admin.
5. Подтвердить retention для publication payloads, attempts, redacted webhook evidence и manual export packages.
6. Подтвердить, что `manual_required` — правильный статус для ручного экспорта до фактического постинга человеком.
