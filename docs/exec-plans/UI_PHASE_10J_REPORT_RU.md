# UI Phase 10j — отчёт

## Что сделано

- Пересобран `apps/web/src/services/projects.ts` как единый service boundary для Project Index, New Project Wizard, Project Detail, Project Builder, Project Settings и Rubric Builder assets.
- `ProjectBuilderShell` больше не импортирует `project-wizard-fixtures` и `rubric-builder-fixtures` напрямую.
- Страницы `/app/projects/new`, `/app/projects/[projectId]`, `/app/projects/[projectId]/builder`, `/app/projects/[projectId]/settings` теперь получают view model из `services/projects.ts`.
- В API-режиме project detail/builder/settings используют `/api/v1/projects/{projectId}`.
- В API-режиме rubric list продолжает использовать `/api/v1/projects/{projectId}/rubrics`.
- Field palette, repeatable groups, style rules, preview blocks и wizard suggestions оставлены fixture-backed, но теперь находятся за сервисной границей.

## Противоречия и открытые вопросы

1. Project/rubric create/update/import/export пока не подключены к UI-мутациям. Нужен отдельный slice с CSRF, version checks и серверной валидацией.
2. Guided form renderer пока не строит редактируемую форму из server JSON schema. Сейчас это технический Visual Builder layout.
3. Field palette и style rules остаются локальными fixture assets; если они должны быть полностью database-driven, нужен backend read contract для builder assets.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10J_PROJECT_BUILDER_SERVICE_BOUNDARY.md`
- Создан: `docs/exec-plans/UI_PHASE_10J_REPORT_RU.md`
- Изменён: `apps/web/src/services/projects.ts`
- Изменён: `apps/web/src/components/phase03/project-builder-shell.tsx`
- Изменён: `apps/web/src/app/app/projects/new/page.tsx`
- Изменён: `apps/web/src/app/app/projects/[projectId]/page.tsx`
- Изменён: `apps/web/src/app/app/projects/[projectId]/builder/page.tsx`
- Изменён: `apps/web/src/app/app/projects/[projectId]/settings/page.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/projects/new`, 390px и 1440px;
  - `/app/projects/demo`, 390px и 1440px;
  - `/app/projects/demo/builder`, 390px и 1440px;
  - `/app/projects/demo/settings`, 390px и 1440px;
  - `/app/projects/demo/rubrics`, 390px и 1440px;
  - `/app/projects/demo/rubrics/demo`, 390px и 1440px.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10j-*.png`.
- Smoke проверил отсутствие horizontal overflow, наличие `main`, русских заголовков и режима `fixtures`.
- Временные порты `3107` и `9236` после проверки закрыты.
- `make validate-spec` — пройден: `checks=68 files=392 errors=0`.
- `git diff --check` — пройден после обновления отчёта.

## Решения, требующие подтверждения

1. Что делать следующим frontend slice: guided form renderer или project/rubric mutations.
2. Нужен ли backend endpoint для database-driven builder assets вместо локальной field palette.
3. Нужно ли в MVP разрешать импорт/экспорт JSON-пакетов из UI или оставить это CLI/admin-процессом до production hardening.
