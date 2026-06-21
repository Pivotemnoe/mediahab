# UI Phase 10d — отчёт

## Что сделано

- Добавлен `apps/web/src/services/content.ts` для content index и верхней карточки Content Studio.
- `/app/content` переведён на `getContentIndexViewModel()`.
- `/app/content/[contentId]` переведён на `getContentStudioViewModel(contentId)`.
- `ContentIndexShell` теперь получает список материалов через view-model и показывает активный data mode.
- `ContentStudioShell` теперь получает summary материала через view-model и показывает активный data mode.
- Fixture fallback сохранён для статической сборки и friendly route `demo-review`.

## Найденные противоречия и открытые вопросы

- API endpoint `GET /content-items/{content_id}` ожидает UUID, поэтому friendly route `demo-review` остаётся на fixture fallback до появления slug/id resolution.
- `/app/content` в API mode пока берёт первый проект первой workspace; полноценный список материалов по нескольким проектам требует project selector или отдельный workspace-level endpoint.
- Входные блоки, guided form, диктовка, STT, autosave, AI-сборка, revisions и platform previews пока остаются fixture-backed. Это следующий более крупный слой.

## Созданные и изменённые файлы

- Создан: `apps/web/src/services/content.ts`
- Создан: `docs/exec-plans/UI_PHASE_10D_CONTENT_SERVICE_BOUNDARY.md`
- Создан: `docs/exec-plans/UI_PHASE_10D_REPORT_RU.md`
- Изменён: `apps/web/src/app/app/content/page.tsx`
- Изменён: `apps/web/src/app/app/content/[contentId]/page.tsx`
- Изменён: `apps/web/src/components/phase04/content-studio-shell.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `pnpm --filter @temichev/web build` — пройдено, собрано 32 маршрута.
- CDP-smoke `/app/content` — пройдено на 390 px и 1440 px, горизонтального overflow нет, `main` найден, fixture badge отображается.
- CDP-smoke `/app/content/demo-review` — пройдено на 390 px и 1440 px, горизонтального overflow нет, `main` найден, fixture badge отображается.
- Скриншоты проверки:
  - `/private/tmp/mediahub-ui10d-content-index-390.png`
  - `/private/tmp/mediahub-ui10d-content-index-1440.png`
  - `/private/tmp/mediahub-ui10d-content-studio-390.png`
  - `/private/tmp/mediahub-ui10d-content-studio-1440.png`
- `make validate-spec` — пройдено: `checks=68 files=374 errors=0`.
- `git diff --check` — пройдено.

## Решения, которые требуют подтверждения

- Подтвердить, нужен ли workspace-level endpoint для списка материалов по всем проектам или достаточно project selector на фронтенде.
- Подтвердить приоритет следующего слоя Content Studio: guided form/blocks/autosave или AI runs/platform variants.
