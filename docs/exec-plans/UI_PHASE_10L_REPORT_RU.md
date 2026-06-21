# UI Phase 10l — отчёт

## Что сделано

- В `ContentStudioViewModel` добавлена schema-driven guided form view model.
- Добавлены frontend DTO для существующего backend endpoint `GET /api/v1/content-items/{content_id}/guided-form`.
- В fixture mode форма строится из входного потока рубрики `Обзор недели`: основные сведения, атмосфера, repeatable group блюд, итог и медиа.
- В API mode форма берётся из `/guided-form`, а текущие значения подтягиваются из `/content-items/{content_id}/blocks`.
- `ContentStudioShell` получил renderer для object fields, long/voice text, media picker posture и repeatable groups.
- Generated fields (`Хук`, `Оценки`, `Переходы`, `CTA`, `Мастер-текст`, `Варианты площадок`) показываются как будущая ИИ-сборка, а не как поля ручного ввода.
- Кнопки сохранения и фиксации фактов в новом renderer оставлены disabled, потому что mutation/autosave slice ещё не подключён.

## Противоречия и открытые вопросы

1. Backend route `/api/v1/content-items/{content_id}/guided-form` существует в коде, но текущий generated OpenAPI JSON его не содержит. Нужно обновить OpenAPI generation отдельным backend/API slice.
2. Renderer пока не является полноценным JSON Schema forms engine: conditional visibility, advanced validation UI и autosave conflict handling остаются следующими задачами.
3. Repeatable group mutation (`POST /content-items/{content_id}/repeatable-groups/{group_key}`) пока не подключена к UI.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10L_GUIDED_FORM_RENDERER.md`
- Создан: `docs/exec-plans/UI_PHASE_10L_REPORT_RU.md`
- Изменён: `apps/web/src/services/openapi-types.ts`
- Изменён: `apps/web/src/services/content.ts`
- Изменён: `apps/web/src/components/phase04/content-studio-shell.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `git diff --check` — пройден до build/smoke.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил наличие `main`, русской формы `Фактическая форма рубрики`, секций `Заведение, адрес и чек`, `Блюда, напитки и десерты`, generated-field бейджей `ИИ позже: Хук` и `ИИ позже: Оценки`, read-only/disabled полей и отсутствие horizontal overflow.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10l-content-390.png` и `/private/tmp/mediahub-ui10l-content-1440.png`.
- Временный CDP-порт `9236` после проверки закрыт.
- `make validate-spec` — пройден: `checks=68 files=396 errors=0`.

## Решения, требующие подтверждения

1. Следующий slice: подключать autosave/block mutations для guided form или сначала обновлять OpenAPI generation под `/guided-form`.
2. Нужен ли полноценный JSON Schema forms engine в MVP, или достаточно постепенно расширять текущий renderer под используемые типы полей.
