# Phase 03 — отчёт: Project And Rubric Builder

Дата: 2026-06-20
Статус: завершено

## Что сделано

Phase 03 реализует технический каркас конструктора проектов и рубрик без перехода к созданию контента из Phase 04.

- Добавлена БД-модель проектов, рубрик, input schemas, правил, промптов, шаблонов, platform overrides и mock rubric suggestions.
- Добавлена Alembic-миграция `202606200003_phase03_project_rubric_builder`.
- Проекты и рубрики сделаны через стабильные parent rows и неизменяемые version rows.
- Импорт preset `chto-poest-armavir` сделан как импорт данных, а не как ветвление поведения в коде.
- Добавлены API для project CRUD, preset/import/export, clone/archive, versions, rubric CRUD, form-schema, schema validation и mock suggestions.
- Добавлены backend-тесты на создание не-food проекта, repeatable rubric schema, новую версию рубрики, idempotent preset import, cross-workspace 404 и `projects.max`.
- Добавлены технические frontend routes:
  - `/app/projects`
  - `/app/projects/new`
  - `/app/projects/[projectId]`
  - `/app/projects/[projectId]/builder`
  - `/app/projects/[projectId]/rubrics`
- Обновлены OpenAPI-контракты и e2e smoke check.
- Добавлен ADR 0009 про версионированную конфигурацию проекта/рубрики.

## Найденные противоречия и открытые вопросы

Явных новых противоречий с каноническими `docs/en` в Phase 03 не найдено.

Открытые вопросы, которые не блокируют текущий технический каркас:

1. Финальный UX/визуальный дизайн конструктора проектов и рубрик нужно утвердить перед заменой технических экранов.
2. Нужно решить, когда mock rubric suggestions переключать на реального AI-провайдера и какие требования к модерации/логам применять.
3. До публичного SaaS остаются вопросы из Phase 02: заменить `ADMIN_API_TOKEN` системной operator-моделью и in-process rate limiter на Redis/shared limiter.
4. Перед production нужно подтвердить реальные лимиты тарифов, платежного провайдера, email-провайдера и сроки хранения raw media / AI logs.

## Созданные и изменённые файлы

Созданы:

- `apps/web/src/app/app/projects/page.tsx`
- `apps/web/src/app/app/projects/new/page.tsx`
- `apps/web/src/app/app/projects/[projectId]/page.tsx`
- `apps/web/src/app/app/projects/[projectId]/builder/page.tsx`
- `apps/web/src/app/app/projects/[projectId]/rubrics/page.tsx`
- `apps/web/src/components/phase03/project-builder-shell.tsx`
- `database/migrations/versions/202606200003_phase03_project_rubric_builder.py`
- `docs/adr/0009-versioned-project-rubric-configuration.md`
- `docs/exec-plans/PHASE_03_PROJECT_AND_RUBRIC_BUILDER.md`
- `docs/exec-plans/PHASE_03_REPORT_RU.md`
- `services/api/app/api/v1/routes/projects.py`
- `services/api/app/modules/projects/__init__.py`
- `services/api/app/modules/projects/presets.py`
- `services/api/app/modules/projects/schema_builder.py`
- `services/api/app/modules/projects/service.py`
- `services/api/tests/test_project_rubric_builder.py`

Изменены:

- `SPEC_MANIFEST.json`
- `apps/web/src/app/app/page.tsx`
- `apps/web/src/generated-api/openapi.json`
- `docs/OPEN_QUESTIONS.md`
- `docs/adr/README.md`
- `packages/contracts/openapi/openapi.json`
- `reference/OPEN_QUESTIONS.md`
- `reference/VALIDATION_REPORT.md`
- `services/api/app/api/v1/router.py`
- `services/api/app/api/v1/routes/health.py`
- `services/api/app/db/base.py`
- `services/api/pyproject.toml`
- `services/api/requirements.txt`
- `tools/e2e_smoke.py`

## Результаты тестов и проверок

Пройдено:

- `.venv/bin/python -m compileall -q services/api/app services/api/tests tools database/migrations`
- `.venv/bin/python -m unittest discover -s services/api/tests` — 14 tests OK
- `make openapi`
- `make migrate` — применена `202606200003`
- `make seed`
- `make lint`
- `make typecheck`
- `make test` — 5 общих tests OK + 14 API tests OK
- `make test-e2e`
- `make validate-spec` — PASS, `checks=67 files=215 errors=0`
- `docker compose -p media-hub up -d --build` из `/private/tmp/media-hub-docker-build`
- Runtime smoke:
  - `GET http://localhost:8100/api/v1/health/ready` — `status=ok`, `migrations=phase03_project_rubric_builder`
  - `HEAD http://localhost:3100/app/projects` — `200 OK`
  - `GET http://localhost:8100/api/v1/openapi.json` — содержит Phase 03 project/rubric paths

Предупреждения:

- В unit-тестах остаётся прежнее предупреждение FastAPI/Starlette TestClient: `install httpx2`.
- При `make typecheck` pip пытался проверить PyPI, но зависимости уже были установлены локально; это не повлияло на результат.

## Решения, которые требуют подтверждения

1. Утвердить, что Phase 03 technical frontend достаточен как временный экран для проверки API и сценариев.
2. Подтвердить подход ADR 0009: parent rows + immutable version rows, а `active_version_id` без FK для снятия циклов создания.
3. Подтвердить, что mock AI suggestions остаются deterministic mock до отдельной фазы подключения реального AI.
4. Подтвердить переход к Phase 04 отдельным сообщением. Phase 04 в этой работе не начиналась.
