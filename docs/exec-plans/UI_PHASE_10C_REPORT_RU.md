# UI Phase 10c — отчёт

## Что сделано

- Добавлен `apps/web/src/services/projects.ts` для project/rubric service boundary.
- `openapi-types.ts` расширен DTO-типами `RubricOut` и `RubricListResponse`.
- `/app/projects` переведён на `getProjectIndexViewModel()`.
- `/app/projects/[projectId]/rubrics` переведён на `getRubricBuilderViewModel(projectId)`.
- `ProjectIndexShell` показывает текущие проекты из view-model и активный data mode.
- `RubricBuilderShell` получает список рубрик из view-model и показывает активный data mode.

## Найденные противоречия и открытые вопросы

- Friendly route `chto-poest-armavir` не является UUID; API mode для rubric list требует реальный `project_id`. До появления slug resolution такой маршрут безопасно остаётся на fixture fallback.
- Центральный инспектор полей рубрики пока остаётся fixture-backed. Следующий слой должен переводить schema/fields editor на API DTO.

## Созданные и изменённые файлы

- Создан: `apps/web/src/services/projects.ts`
- Создан: `docs/exec-plans/UI_PHASE_10C_PROJECT_RUBRIC_SERVICES.md`
- Создан: `docs/exec-plans/UI_PHASE_10C_REPORT_RU.md`
- Изменён: `apps/web/src/services/openapi-types.ts`
- Изменён: `apps/web/src/app/app/projects/page.tsx`
- Изменён: `apps/web/src/app/app/projects/[projectId]/rubrics/page.tsx`
- Изменён: `apps/web/src/components/phase03/project-builder-shell.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `pnpm --filter @temichev/web build` — пройдено, собрано 32 маршрута.
- CDP-smoke `/app/projects` — пройдено на 390 px и 1440 px, горизонтального overflow нет, `main` найден, fixture badge отображается.
- CDP-smoke `/app/projects/chto-poest-armavir/rubrics` — пройдено на 390 px и 1440 px, горизонтального overflow нет, `main` найден, fixture badge отображается.
- Скриншоты проверки:
  - `/private/tmp/mediahub-ui10c-projects-390.png`
  - `/private/tmp/mediahub-ui10c-projects-1440.png`
  - `/private/tmp/mediahub-ui10c-rubrics-390.png`
  - `/private/tmp/mediahub-ui10c-rubrics-1440.png`
- `make validate-spec` — пройдено: `checks=68 files=371 errors=0`.
- `git diff --check` — пройдено.

## Решения, которые требуют подтверждения

- Подтвердить, что следующим service-boundary slice делаем content studio.
- Подтвердить, нужен ли slug resolution для `/app/projects/chto-poest-armavir/*` до полноценного live API mode.
