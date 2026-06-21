# UI Phase 10al — отчёт

## Что сделано

- Guided local queue job получил backward-compatible `metadata` для single-field формы.
- Metadata сохраняет:
  - `contentId`;
  - `fieldKey`;
  - `blockId`;
  - `itemVersion`;
  - `sourceType`;
  - последний submit `intent` (`save` или `lock`);
  - `kind: "field"`.
- Старые localStorage jobs без metadata продолжают парситься с `metadata: null`.
- Невалидная metadata отфильтровывается; частично валидная metadata нормализуется без выдумывания intent.
- `guided-queue-replay` получил pure helper `buildGuidedQueueReplayRequestDraft`.
- Request draft строит:
  - `PATCH /api/v1/content-blocks/:blockId` для существующего блока;
  - `PUT /api/v1/content-items/:contentId/blocks/:fieldKey` для нового блока.
- Legacy/malformed jobs возвращают `status: "incomplete"` и список missing keys вместо неявного replay.
- Автоматический replay и backend mutation не включались.

## Противоречия и открытые вопросы

1. Автоматический background replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
2. Request-envelope draft пока не исполняется и не отправляется в backend.
3. Repeatable group creation пока не подключена к durable queue UI.
4. Merge UI для `version_conflict`, live STT/upload и publication flow остаются открытыми частями полного ТЗ.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AL_GUIDED_QUEUE_REQUEST_ENVELOPE.md`
- Создан: `docs/exec-plans/UI_PHASE_10AL_REPORT_RU.md`
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
- Скриншоты сохранены как `/private/tmp/mediahub-ui10al-content-390.png` и `/private/tmp/mediahub-ui10al-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=465 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Следующий рекомендуемый slice

Продолжить guided-form recovery path: durable queue UI для repeatable group creation или explicit manual replay surface, которая показывает готовность request draft без автоматической отправки.
