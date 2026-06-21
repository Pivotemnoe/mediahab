# UI Phase 10v — отчёт

## Что сделано

- Добавлен общий browser-local queue store: `apps/web/src/services/guided-queue-store.ts`.
- Store теперь отвечает за:
  - чтение одного guided-form queue job;
  - запись queue job;
  - очистку queue job;
  - перечисление валидных queue entries с `storageKey` и parsed `GuidedQueueJob`;
  - подсчёт валидных queue entries для app shell.
- `guided-form-actions.tsx` больше не держит wrappers вокруг `localStorage` для guided queue.
- `OfflineStatus` больше не считает все ключи с queue prefix. Он считает только entries, которые:
  - имеют корректный parsed payload;
  - содержат хотя бы одно непустое значение поля.
- Same-tab update contract сохранён: store dispatch-ит прежний `tmh-guided-form-queue-change` event после write/clear.

## Противоречия и открытые вопросы

1. Это всё ещё не service-worker/background-sync replay. Store создаёт source-level boundary для будущего replay, но `public/sw.js` остаётся статическим.
2. Malformed/empty browser queue entries больше не показываются в app-shell счётчике. Это честнее для пользователя, но отдельный cleanup UI для битых записей пока не добавлен.
3. Live API-mode smoke для autosave/conflict/retry path всё ещё не выполнен.

## Созданные и изменённые файлы

- Создан: `apps/web/src/services/guided-queue-store.ts`
- Создан: `docs/exec-plans/UI_PHASE_10V_GUIDED_QUEUE_STORE_BOUNDARY.md`
- Создан: `docs/exec-plans/UI_PHASE_10V_REPORT_RU.md`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`
- Изменён: `apps/web/src/components/pwa/offline-status.tsx`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через in-app browser — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke подтвердил наличие `main`, guided field group, repeatable-group slot, action/autosave/queue status slots, disabled mutation buttons в fixture mode и отсутствие horizontal overflow.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10v-content-390.png` и `/private/tmp/mediahub-ui10v-content-1440.png`.
- `make validate-spec` — пройден: `checks=68 files=421 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10w: выбрать и реализовать первый безопасный replay step для guided-form queue: либо authenticated API-mode smoke для autosave/conflict/retry, либо service-worker build strategy с явным запретом на replay без HttpOnly cookie/CSRF подтверждения.
