# UI Phase 10e — отчёт

## Что сделано

- Добавлен маршрут `/app/projects/[projectId]/settings`.
- Добавлен маршрут `/app/projects/[projectId]/rubrics/new`.
- Добавлен маршрут `/app/projects/[projectId]/rubrics/[rubricId]`.
- Список рубрик теперь ведёт на detail route конкретной рубрики.
- Страница проекта теперь даёт переход в настройки проекта.
- `apps/web/src/services/projects.ts` расширен `id`/`href` для рубрик и detail view-model.
- `docs/frontend/ROUTE_MAP.md` синхронизирован с фактическими маршрутами.

## Найденные противоречия и открытые вопросы

- В route map эти маршруты числились missing, хотя UI Phase 04 уже считалась выполненной. Закрыто route-level shell-слоем без backend CRUD.
- Кнопки сохранения в новых экранах disabled, потому что реальные mutation endpoints для сохранения UI-изменений в этой фазе не подключались.
- Friendly route ids остаются fixture-backed; live API mode для project/rubric detail требует реальные UUID.

## Созданные и изменённые файлы

- Создан: `apps/web/src/app/app/projects/[projectId]/settings/page.tsx`
- Создан: `apps/web/src/app/app/projects/[projectId]/rubrics/new/page.tsx`
- Создан: `apps/web/src/app/app/projects/[projectId]/rubrics/[rubricId]/page.tsx`
- Создан: `docs/exec-plans/UI_PHASE_10E_PROJECT_ROUTE_COMPLETION.md`
- Создан: `docs/exec-plans/UI_PHASE_10E_REPORT_RU.md`
- Изменён: `apps/web/src/components/phase03/project-builder-shell.tsx`
- Изменён: `apps/web/src/services/projects.ts`
- Изменён: `docs/frontend/ROUTE_MAP.md`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `pnpm --filter @temichev/web build` — пройдено; новые маршруты появились в таблице Next build.
- CDP-smoke `/app/projects/chto-poest-armavir/settings` — пройдено на 390 px и 1440 px, горизонтального overflow нет.
- CDP-smoke `/app/projects/chto-poest-armavir/rubrics/new` — пройдено на 390 px и 1440 px, горизонтального overflow нет.
- CDP-smoke `/app/projects/chto-poest-armavir/rubrics/obzor-nedeli` — пройдено на 390 px и 1440 px, горизонтального overflow нет.
- Скриншоты проверки:
  - `/private/tmp/mediahub-ui10e-project-settings-390.png`
  - `/private/tmp/mediahub-ui10e-project-settings-1440.png`
  - `/private/tmp/mediahub-ui10e-rubric-new-390.png`
  - `/private/tmp/mediahub-ui10e-rubric-new-1440.png`
  - `/private/tmp/mediahub-ui10e-rubric-detail-390.png`
  - `/private/tmp/mediahub-ui10e-rubric-detail-1440.png`
- `make validate-spec` — пройдено: `checks=68 files=379 errors=0`.
- `git diff --check` — пройдено.

## Решения, которые требуют подтверждения

- Подтвердить, подключаем ли дальше real API mutations для rubric CRUD или сначала закрываем service boundary для integrations/billing/workspace.
- Подтвердить, нужен ли отдельный `/app/projects/[projectId]/settings` как полноценный экран или позже перенести часть настроек в `/builder`.
