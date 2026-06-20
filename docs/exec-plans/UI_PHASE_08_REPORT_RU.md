# UI Phase 08 — отчёт

## Что сделано

- Экран `/app/examples` обновлён: фильтры, импорт JSON, reindex, поиск, approval/rejection posture, score и fragments.
- Экран `/app/media` обновлён: фильтры, upload posture, порядок медиа, cover action, remove-from-content posture и platform compatibility warnings.
- Экран `/app/calendar` обновлён: календарная сетка, очередь расписания, timezone/outbox notes, schedule/reschedule/cancel posture.
- Добавлены fixture-данные для examples, media и calendar.

## Найденные противоречия и открытые вопросы

- Drag-and-drop scheduling указан как later, поэтому в этой фазе показаны только reorder/schedule posture без реального DnD.
- Реальные import/upload/schedule API не подключались; экраны fixture-first.
- Нужно подтвердить, какие фильтры примеров должны быть первыми в MVP: статус, рубрика, score или источник импорта.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_08_EXAMPLES_MEDIA_CALENDAR.md`
- Создан: `docs/exec-plans/UI_PHASE_08_REPORT_RU.md`
- Создан: `apps/web/src/features/library-planning/library-planning-fixtures.ts`
- Изменён: `apps/web/src/app/app/examples/page.tsx`
- Изменён: `apps/web/src/app/app/calendar/page.tsx`
- Изменён: `apps/web/src/components/phase04/content-studio-shell.tsx`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройдено, 32 route.
- Visual smoke `/app/examples`, `/app/media`, `/app/calendar` через Chrome DevTools Protocol — пройдено на 390/768/1280/1440 px.
- CDP layout check — `documentElement.scrollWidth` равен viewport на 390/768/1280/1440 px для трёх страниц.
- Скриншоты: `/private/tmp/mediahub-ui08-examples-390.png`, `/private/tmp/mediahub-ui08-examples-768.png`, `/private/tmp/mediahub-ui08-examples-1280.png`, `/private/tmp/mediahub-ui08-examples-1440.png`, `/private/tmp/mediahub-ui08-media-390.png`, `/private/tmp/mediahub-ui08-media-768.png`, `/private/tmp/mediahub-ui08-media-1280.png`, `/private/tmp/mediahub-ui08-media-1440.png`, `/private/tmp/mediahub-ui08-calendar-390.png`, `/private/tmp/mediahub-ui08-calendar-768.png`, `/private/tmp/mediahub-ui08-calendar-1280.png`, `/private/tmp/mediahub-ui08-calendar-1440.png`.
- `make validate-spec` — пройдено, `checks=68 files=354 errors=0`.
- `git diff --check` — пройдено.

## Решения, которые требуют подтверждения

- Подтвердить, что drag-and-drop для calendar/media можно оставить до hardening/integration.
- Подтвердить, что rejected examples показываем в библиотеке как negative patterns, но не используем как positive style context.
- Подтвердить, что upload/import/schedule пока остаются UI posture без backend mutation.
