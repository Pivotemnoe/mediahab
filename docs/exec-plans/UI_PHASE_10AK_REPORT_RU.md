# UI Phase 10ak — отчёт

## Что сделано

- Guided local queue values расширены до `string | string[]`.
- Queue parser остаётся backward-compatible со старыми string-only jobs.
- Невалидные элементы массивов отфильтровываются; нестроковые значения по-прежнему не попадают в queue job.
- Empty arrays и arrays только из blank strings не держат queue job живым.
- Local draft capture теперь сохраняет все selected options из native `<select multiple>`.
- Local draft restore выставляет selected options из массива для multiple select; для остальных контролов используется первое значение.
- `buildGuidedQueueReplayDraft` передаёт массивы в shared typed mapper, поэтому `multi_select` draft больше не схлопывается до одного значения.

## Противоречия и открытые вопросы

1. Автоматический background replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
2. Replay draft всё ещё не строит сетевой request envelope и не делает mutation.
3. Repeatable group creation пока не подключена к durable queue UI.
4. Merge UI для `version_conflict`, live STT/upload и publication flow остаются открытыми частями полного ТЗ.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AK_GUIDED_QUEUE_ARRAY_VALUES.md`
- Создан: `docs/exec-plans/UI_PHASE_10AK_REPORT_RU.md`
- Изменён: `apps/web/src/services/guided-queue-contract.ts`
- Изменён: `apps/web/src/services/guided-queue-replay.ts`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`
- Изменён: `tools/check_guided_queue_contract.mjs`
- Изменён: `tools/check_guided_queue_replay.mjs`

## Результаты тестов и проверок

- `node tools/check_guided_queue_contract.mjs` — пройден.
- `node tools/check_guided_queue_replay.mjs` — пройден.
- `make typecheck` — пройден.
- `make test-ui-hardening` — пройден.
- `make lint` — пройден.
- `make test` — пройден: `Ran 42 tests ... OK`.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через изолированный Chrome/Playwright context с `serviceWorkers: "block"` — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил наличие `main`, guided form text, `группа полей`, `Добавить позицию`, `Статус действия появится здесь.`, disabled-кнопки `Сохранить`, `Сохранить и зафиксировать`, `Добавить`, `Добавить и зафиксировать`, отсутствие horizontal overflow и PWA flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10ak-content-390.png` и `/private/tmp/mediahub-ui10ak-content-1440.png`.
- In-app browser smoke был заблокирован stale service-worker cache текущей browser-сессии и показывал старый fallback `Загружаем кабинет`; для проверки актуального localhost render использован новый browser context без service worker.
- `make validate-spec` — пройден: `checks=69 files=463 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Следующий рекомендуемый slice

Продолжить guided-form recovery path: request-envelope preparation для ручного replay или durable queue UI для repeatable group creation.
