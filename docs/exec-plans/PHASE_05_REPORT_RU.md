# Отчёт Phase 05 — примеры и AI-пайплайн

## Что сделано

Phase 05 добавляет технический вертикальный срез AI-редактора: импорт примеров, дедупликацию, approval/reject, mock embeddings, retrieval малым набором, provider interfaces, OpenAI-ready text/embedding adapters, generation runs/steps, сборку master revision, предложения крючков и оценок, CTA и deterministic quality check.

Фронтенд остаётся русской технической оболочкой: добавлены экраны `/app/ai` и `/app/projects/[projectId]/examples`. Это не финальный визуальный дизайн.

Phase 06 не начиналась: platform variants, публикации, outbox, scheduling, manual export и generic webhook не реализованы.

## Найденные противоречия и открытые вопросы

1. ТЗ Phase 05 требует live text provider. OpenAI выбран первым live provider; для запуска реального smoke ещё нужны `OPENAI_API_KEY`, месячный бюджет и тестовый материал.
2. YandexGPT и GigaChat указаны в ТЗ как начальные text providers. В Phase 05 они представлены contract-complete mock adapters; live-интеграция отложена после выбора OpenAI первым провайдером.
3. Embeddings хранятся как JSON-векторы для SQLite-тестов. Для production-библиотеки примеров нужен переход на pgvector index/HNSW после появления реального объёма.
4. AI tasks записываются как durable `generation_runs`, но выполняются синхронно в API request. Для production тяжёлые задачи нужно вынести в worker queue.
5. Ranking formula оставлена текущей. Финальные forbidden phrases, CTA library и retention для AI logs требуют наполнения/подтверждения владельца продукта.
6. Во время Docker-smoke найден runtime gap: API image не включал каталоги `presets` и `schemas`, из-за чего импорт проекта из preset падал в контейнере. Исправлено в `infra/docker/api.Dockerfile`.

## Созданные файлы

- `apps/web/src/app/app/ai/page.tsx`
- `apps/web/src/app/app/projects/[projectId]/examples/page.tsx`
- `apps/web/src/components/phase05/ai-pipeline-shell.tsx`
- `database/migrations/versions/202606200005_phase05_examples_ai_pipeline.py`
- `docs/adr/0011-examples-retrieval-and-ai-runs.md`
- `docs/adr/0012-openai-defaults-ranking-and-ai-retention.md`
- `docs/exec-plans/PHASE_05_AI_AND_EXAMPLES.md`
- `docs/exec-plans/PHASE_05_REPORT_RU.md`
- `services/api/app/api/v1/routes/ai.py`
- `services/api/app/modules/ai/__init__.py`
- `services/api/app/modules/ai/providers.py`
- `services/api/app/modules/ai/service.py`
- `services/api/tests/test_ai_examples_pipeline.py`

## Изменённые файлы

- `.env.example`
- `apps/web/src/app/app/page.tsx`
- `apps/web/src/components/phase03/project-builder-shell.tsx`
- `apps/web/src/generated-api/openapi.json`
- `docs/en/API_CONTRACT.md`
- `docs/OPEN_QUESTIONS.md`
- `docs/adr/README.md`
- `docs/ru/API_CONTRACT.md`
- `infra/docker/api.Dockerfile`
- `packages/contracts/openapi/openapi.json`
- `reference/OPEN_QUESTIONS.md`
- `reference/VALIDATION_REPORT.md`
- `SPEC_MANIFEST.json`
- `services/api/app/api/v1/router.py`
- `services/api/app/api/v1/routes/health.py`
- `services/api/app/core/config.py`
- `services/api/app/db/base.py`
- `tools/e2e_smoke.py`

## Результаты тестов и проверок

- `make openapi` — прошёл, OpenAPI обновлён.
- `make lint` — прошёл.
- `make typecheck` — прошёл.
- `make test` — прошёл: 5 общих тестов и 22 API-теста.
- `make test-e2e` — прошёл: Phase 05 OpenAPI paths найдены.
- `make migrate` — прошёл: применена миграция `202606200005`.
- `make seed` — прошёл.
- `make validate-spec` — прошёл: `checks=67 files=242 errors=0`.
- `git diff --check` — прошёл.
- Docker runtime smoke — прошёл после исправления image: API readiness показывает `phase05_examples_ai_pipeline`, страницы `/app/ai` и `/app/projects/demo/examples` отдают `200`, runtime OpenAPI содержит 81 path и все Phase 05 endpoints, живой сценарий register → import preset → import examples → fill content → `assemble-master` завершился `completed` на `mock`.

## Решения, которые требуют подтверждения

1. Передать `OPENAI_API_KEY` в runtime-окружение и подтвердить месячный бюджет для live-smoke.
2. Выбрать sample content item и approved examples для первого OpenAI live-smoke.
3. Наполнить forbidden phrases и CTA library для «Что поесть? Армавир».
4. Подтвердить recommended retention из ADR 0012 или заменить сроки до реализации cleanup jobs.
