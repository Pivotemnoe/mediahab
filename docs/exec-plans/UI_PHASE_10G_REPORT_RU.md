# UI Phase 10g — отчёт

## Что сделано

- Добавлен `apps/web/src/services/library-planning.ts`.
- `openapi-types.ts` расширен DTO для examples и content media.
- `/app/examples` переведён на `getExamplesLibraryViewModel()`.
- `/app/media` переведён на `getMediaLibraryViewModel()`.
- `/app/calendar` переведён на `getCalendarViewModel()`.
- `MediaLibraryShell` теперь получает данные через view-model и показывает active data mode.
- Fixture fallback сохранён для сборки без backend.

## Найденные противоречия и открытые вопросы

- API mode пока берёт первую workspace, первый project и первый content item. Для полноценного продукта нужен явный selector контекста.
- Media screen в API mode сейчас показывает связку content-media без подробного запроса каждого asset. Богатые метаданные медиа лучше добавить отдельным срезом.
- Импорт/approve/reject examples, media upload/reorder и schedule/reschedule/cancel остаются posture-only.

## Созданные и изменённые файлы

- Создан: `apps/web/src/services/library-planning.ts`
- Создан: `docs/exec-plans/UI_PHASE_10G_LIBRARY_PLANNING_SERVICES.md`
- Создан: `docs/exec-plans/UI_PHASE_10G_REPORT_RU.md`
- Изменён: `apps/web/src/services/openapi-types.ts`
- Изменён: `apps/web/src/app/app/examples/page.tsx`
- Изменён: `apps/web/src/app/app/media/page.tsx`
- Изменён: `apps/web/src/app/app/calendar/page.tsx`
- Изменён: `apps/web/src/components/phase04/content-studio-shell.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `pnpm --filter @temichev/web build` — пройдено, 32 маршрута.
- CDP-smoke `/app/examples` — пройдено на 390 px и 1440 px, горизонтального overflow нет, fixture badge отображается.
- CDP-smoke `/app/media` — пройдено на 390 px и 1440 px, горизонтального overflow нет, fixture badge отображается.
- CDP-smoke `/app/calendar` — пройдено на 390 px и 1440 px, горизонтального overflow нет, fixture badge отображается.
- Скриншоты проверки:
  - `/private/tmp/mediahub-ui10g-examples-390.png`
  - `/private/tmp/mediahub-ui10g-examples-1440.png`
  - `/private/tmp/mediahub-ui10g-media-390.png`
  - `/private/tmp/mediahub-ui10g-media-1440.png`
  - `/private/tmp/mediahub-ui10g-calendar-390.png`
  - `/private/tmp/mediahub-ui10g-calendar-1440.png`
- `make validate-spec` — пройдено: `checks=68 files=385 errors=0`.
- `git diff --check` — пройдено.

## Решения, которые требуют подтверждения

- Подтвердить, когда вводим явный workspace/project/content selector для API mode.
- Подтвердить следующий приоритет: media asset detail fan-out, live mutations для examples/media/calendar или переход к content blocks/autosave.
