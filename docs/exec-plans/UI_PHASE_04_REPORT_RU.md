# UI Phase 04 — отчёт

## Что сделано

- Экран `/app/projects/[projectId]/rubrics` переработан в Rubric Builder по UI roadmap.
- Добавлены отдельные fixture-данные для списка рубрик, палитры полей, canvas формы, повторяемых групп, платформенных стратегий, правил стиля и preview мобильной формы.
- В интерфейсе появились три рабочие зоны: список/палитра, полотно формы, инспектор/preview.
- Добавлены индикаторы черновика и версии, чтобы экран отражал immutable-version подход из технического ТЗ.
- Raw JSON не показывается в обычном UI; структура представлена как читаемая форма.

## Найденные противоречия и открытые вопросы

- UI roadmap требует CRUD рубрик, но в этой фазе backend-мутации не подключались. Пока это fixture-прототип поверх уже существующего route.
- Спецификация говорит о drag-and-drop, но без новой библиотеки сейчас показан стабильный drag-handle и порядок полей. Реальное перетаскивание нужно подключать позже.
- Тестовая генерация показана как действие, но не вызывает AI API. Подключение `/ai/project/*` и schema validation нужно делать в integration phase.
- Нужно подтвердить, оставляем ли авторские рубрики из примеров как стартовый seed для MVP или переносим их только в демо-пресет.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_04_RUBRIC_BUILDER.md`
- Создан: `docs/exec-plans/UI_PHASE_04_REPORT_RU.md`
- Создан: `apps/web/src/features/rubric-builder/rubric-builder-fixtures.ts`
- Изменён: `apps/web/src/components/phase03/project-builder-shell.tsx`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройдено, 32 route.
- `make validate-spec` — пройдено, `checks=68 files=342 errors=0`.
- `git diff --check` — пройдено.
- Visual smoke `/app/projects/demo/rubrics` через Chrome DevTools Protocol — пройдено на 390/768/1280/1440 px.
- CDP layout check — `documentElement.scrollWidth` равен viewport на 390/768/1280/1440 px.
- Скриншоты: `/private/tmp/mediahub-ui04-rubrics-390.png`, `/private/tmp/mediahub-ui04-rubrics-768.png`, `/private/tmp/mediahub-ui04-rubrics-1280.png`, `/private/tmp/mediahub-ui04-rubrics-1440.png`.

## Решения, которые требуют подтверждения

- Подтвердить, когда подключать реальные API-мутации Rubric CRUD и сохранение новых версий.
- Подтвердить, нужен ли полноценный drag-and-drop уже в следующей UI-фазе или можно оставить до hardening/integration.
- Подтвердить, что raw JSON/schema editor не нужен в основном сценарии и должен быть спрятан в расширенный режим.
