# UI Phase 10h — отчёт

## Что сделано

- Добавлен `apps/web/src/services/ai.ts` для service boundary экранов `/app/ai` и `/app/projects/[projectId]/examples`.
- `/app/ai` теперь получает view model через `getAiPipelineViewModel()`, показывает активный режим данных и контекст проекта/материала.
- `/app/projects/[projectId]/examples` теперь получает view model через `getProjectExamplesViewModel(projectId)`.
- `AiPipelineShell` и `ExamplesLibraryShell` больше не держат основные fixture-массивы внутри компонента.
- В API-режиме project examples читаются через `/api/v1/projects/{projectId}/examples`, а названия рубрик через `/api/v1/projects/{projectId}/rubrics`.
- Явно зафиксировано ограничение: backend пока не даёт list endpoint для последних AI-запусков, поэтому журнал AI-запусков остаётся технической posture-моделью.

## Противоречия и открытые вопросы

1. Для AI-run journal есть `GET /api/v1/ai-runs/{run_id}`, retry и cancel, но нет endpoint для списка последних запусков по workspace/project/content. Нужен отдельный backend-slice, если этот журнал должен стать server-authoritative.
2. `/app/ai` в API-режиме временно берёт первый workspace, первый project и первый content item. Для production нужны явные селекторы.
3. Кнопки AI-мутаций остаются posture-only. Реальные действия надо подключать отдельным slice с CSRF, optimistic state, ошибками и подтверждением пользователя.

## Созданные и изменённые файлы

- Создан: `apps/web/src/services/ai.ts`
- Создан: `docs/exec-plans/UI_PHASE_10H_AI_EXAMPLES_SERVICE_BOUNDARY.md`
- Создан: `docs/exec-plans/UI_PHASE_10H_REPORT_RU.md`
- Изменён: `apps/web/src/services/openapi-types.ts`
- Изменён: `apps/web/src/app/app/ai/page.tsx`
- Изменён: `apps/web/src/app/app/projects/[projectId]/examples/page.tsx`
- Изменён: `apps/web/src/components/phase05/ai-pipeline-shell.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/ai`, 390px: `/private/tmp/mediahub-ui10h-ai-390.png`
  - `/app/ai`, 1440px: `/private/tmp/mediahub-ui10h-ai-1440.png`
  - `/app/projects/demo/examples`, 390px: `/private/tmp/mediahub-ui10h-project-examples-390.png`
  - `/app/projects/demo/examples`, 1440px: `/private/tmp/mediahub-ui10h-project-examples-1440.png`
- Smoke проверил отсутствие horizontal overflow, наличие `main`, русских заголовков и бейджа `Данные: fixtures`.
- Временные порты `3107` и `9236` после проверки закрыты.
- `make validate-spec` — пройден: `checks=68 files=388 errors=0`.
- `git diff --check` — пройден после обновления отчёта.

## Решения, требующие подтверждения

1. Добавлять ли backend endpoint списка AI-запусков: например `GET /api/v1/content-items/{content_id}/ai-runs` или `GET /api/v1/projects/{project_id}/ai-runs`.
2. Когда заменить временный выбор первого workspace/project/content на явный селектор в UI.
3. В каком slice подключать реальные AI POST-действия с CSRF и пользовательским подтверждением.
