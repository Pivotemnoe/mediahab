# UI Phase 10s — отчёт

## Что сделано

- App shell `OfflineStatus` подключён к guided-form local queue.
- Guided-form queue теперь имеет общий prefix/event contract:
  - `tmh:guided-form-queue:v1`;
  - `tmh-guided-form-queue-change`.
- При записи или очистке guided-form queue job форма отправляет browser event для same-tab обновления shell.
- `OfflineStatus` считает количество локальных guided-form queue jobs в `localStorage`.
- Shell показывает:
  - offline status без очереди;
  - offline status с количеством queued guided-form jobs;
  - online status с количеством unsynced fields, если очередь не пуста.
- Shell не показывает содержимое queued полей, request payloads, cookies, tokens или credentials.

## Противоречия и открытые вопросы

1. Это app-shell indicator, а не service worker/background sync replay.
2. Повтор конкретного queued job остаётся внутри Content Studio, потому что только форма знает контекст поля и server action.
3. Live queue count acceptance требует API mode или ручное seed-состояние localStorage.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10S_GUIDED_QUEUE_APP_STATUS.md`
- Создан: `docs/exec-plans/UI_PHASE_10S_REPORT_RU.md`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`
- Изменён: `apps/web/src/components/pwa/offline-status.tsx`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил, что без local queue shell banner не показывается, при seeded localStorage queue shell показывает `Есть несинхронизированные поля: 2.`, queued field text не попадает в UI, кнопки fixture mode остаются disabled и horizontal overflow отсутствует.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10s-content-390.png` и `/private/tmp/mediahub-ui10s-content-1440.png`.
- `make validate-spec` — пройден: `checks=68 files=413 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10t: live API-mode smoke для autosave/conflict/offline queue path или service worker/background sync replay для guided-form queue.
