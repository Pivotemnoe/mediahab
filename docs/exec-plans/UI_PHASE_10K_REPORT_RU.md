# UI Phase 10k — отчёт

## Что сделано

- Последний локальный список entry point cards на странице `/app/projects` перенесён из `ProjectBuilderShell` в `apps/web/src/services/projects.ts`.
- `ProjectIndexViewModel` теперь явно отдаёт карточки входа: `С нуля`, `Из пресета`, `Импорт пакета`.
- `ProjectBuilderShell` больше не хранит project-index fixture data; компонент только отображает view model и сопоставляет ключ иконки с Lucide icon.
- Обновлена стратегия mock/service boundary: Project Index entry points отмечены как перенесённые за сервисную границу.

## Противоречия и открытые вопросы

1. Project/rubric mutations всё ещё не подключены к UI: создание, импорт, экспорт и обновление проекта остаются техническими заглушками.
2. Для database-driven builder assets пока нет отдельного backend read contract; palette/style rules остаются fixture-backed за сервисной границей.
3. Если entry point cards должны управляться из backend или feature flags, нужен отдельный contract. Сейчас они являются стабильной UI view model в сервисе.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10K_PROJECT_INDEX_CLEANUP.md`
- Создан: `docs/exec-plans/UI_PHASE_10K_REPORT_RU.md`
- Изменён: `apps/web/src/services/projects.ts`
- Изменён: `apps/web/src/components/phase03/project-builder-shell.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `git diff --check` — пройден до visual smoke.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/projects`, 390px;
  - `/app/projects`, 1440px.
- Smoke проверил наличие `main`, русских карточек `С нуля`, `Из пресета`, `Импорт пакета`, режима `fixtures` и отсутствие horizontal overflow.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10k-projects-390.png` и `/private/tmp/mediahub-ui10k-projects-1440.png`.
- Временные порты `3107` и `9236` после проверки закрыты.
- `make validate-spec` — пройден: `checks=68 files=394 errors=0`.

## Решения, требующие подтверждения

1. Следующий крупный frontend slice: подключать project/rubric mutations или сначала делать guided form renderer.
2. Нужен ли backend-managed список entry point cards, или текущего service-level view model достаточно для MVP.
