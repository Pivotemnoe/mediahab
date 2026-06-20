# Отчёт Phase 06 — публикационное ядро

## Что сделано

Phase 06 добавляет технический публикационный контур до нативных соцсетевых коннекторов: неизменяемые варианты под площадки, capability registry, validate/approve, project destinations, публикации, попытки, external post records, webhook inbox и PostgreSQL-backed outbox.

Нативные Telegram/MAX/Instagram API не используются. Для проверки доставки в этой фазе есть ручной экспорт и симулируемый generic webhook.

Фронтенд остаётся русской технической оболочкой: `/app/publications` показывает варианты, approval, destinations, статусы очереди, attempts, retry и manual package. Это не финальный визуальный дизайн.

## Найденные противоречия и открытые вопросы

1. ТЗ требует durable publication pipeline на Celery/Redis, но также фиксирует PostgreSQL transactional outbox как source of truth. Production-решение утверждено: PostgreSQL outbox, single Celery Beat polling каждые 2 секунды, batch 100, `FOR UPDATE SKIP LOCKED`, lease 60 секунд, watchdog 60 секунд, at-least-once delivery и idempotent consumers/connectors.
2. Generic webhook по ТЗ должен уметь signed JSON и SSRF protection. Production-решение утверждено: по умолчанию `simulate`, staging только `allowlisted_live`, общий live включается только после SSRF/DNS/egress/signing/verification/timeout/rate-limit/audit/kill-switch контролей.
3. Ручной экспорт в Phase 06 переводит публикацию в `manual_required`, а не в финальное `published`, потому что внешняя публикация человеком ещё не подтверждена. Добавлена явная операция подтверждения manual-публикации владельцем/админом.
4. Production-модель прав утверждена: owner/admin публикуют по умолчанию; editor может готовить, редактировать, генерировать, preview/export и отправлять на approval, но не публикует без будущего granular `content.publish`.
5. Telegram/MAX/Instagram variants создаются и валидируются по hard limits, но нативная отправка остаётся для Phase 07/08/09.
6. Сроки хранения publication payloads, attempts, webhook evidence, outbox и manual export утверждены в ADR 0013; cleanup jobs ещё не реализованы.

## Созданные файлы

- `apps/web/src/components/phase06/publication-core-shell.tsx`
- `database/migrations/versions/202606200006_phase06_publication_core.py`
- `database/migrations/versions/202606200007_publication_production_decisions.py`
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
- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v` — прошёл: 6 тестов.
- `make openapi` — прошёл, OpenAPI обновлён.
- `make test-e2e` — прошёл: Phase 06 publication core paths, включая manual confirmation endpoint, найдены.
- `make typecheck` — прошёл.
- `make lint` — прошёл.
- `make test` — прошёл: 5 общих тестов и 28 API-тестов.
- `make migrate` — прошёл: применены миграции до `202606200007`.
- `make seed` — прошёл.
- `make validate-spec` — прошёл: `checks=67 files=254 errors=0`.
- `git diff --check` — прошёл.
- Docker runtime smoke — прошёл после прямой сборки образов `media-hub-api`, `media-hub-worker`, `media-hub-web` и запуска `docker compose -p media-hub up -d --no-build`: API readiness показывает `phase06_publication_production_decisions`, live OpenAPI содержит `/api/v1/publications/{publication_id}/confirm-manual`, всего 103 path, `/app/publications` отдаёт `200`.

## Технические замечания по сборке

- `docker compose -p media-hub up --build -d` в текущем окружении упал на BuildKit/bake gRPC header. Обход: `docker build` для backend/web образов и `docker compose -p media-hub up -d --no-build`.

## Решения, которые требуют подтверждения

1. Подтвердить UI/admin flow для будущей выдачи project-level `content.publish` выбранным редакторам.
2. Подтвердить, какие конкретные production endpoints будут в allowlist для staging `allowlisted_live` webhook.
3. Подтвердить сроки хранения для voice notes, raw media и AI logs отдельно от уже утверждённого publication retention.
