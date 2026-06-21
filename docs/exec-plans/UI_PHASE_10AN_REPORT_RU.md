# UI Phase 10an — отчёт

## Что сделано

- Guided-form queue contract расширен для repeatable group creation jobs.
- Добавлен отдельный metadata kind `repeatable_group` с `contentId`, `groupKey`, `intent`, `itemVersion` и `sourceType`.
- Добавлен стабильный storage key helper для repeatable group queue jobs.
- Manual replay request draft теперь умеет собирать неисполняемый `POST /api/v1/content-items/{contentId}/repeatable-groups/{groupKey}` request для complete repeatable jobs.
- Incomplete repeatable jobs возвращают явные missing keys, включая `metadata.intent` и `values.fields`.
- UI-лейбл missing reason получил русское имя для `values.fields`: `полей позиции`.
- Automatic replay, backend отправка и fixture mode поведение не менялись.

## Противоречия и открытые вопросы

1. Repeatable queue contract готовит request draft, но UI ещё не записывает repeatable failures в durable queue.
2. Automatic background replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
3. Safe manual replay execution flow требует отдельного среза и подтверждения cookie/CSRF strategy.
4. Live STT/upload и publication flow остаются открытыми частями полного ТЗ.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AN_GUIDED_QUEUE_REPEATABLE_CONTRACT.md`
- Создан: `docs/exec-plans/UI_PHASE_10AN_REPORT_RU.md`
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
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- Visual smoke `/app/content/demo-review` — пройден на 390px и 1440px через isolated Playwright/Chrome context с `serviceWorkers: "block"`.
  Проверены `main`, guided-form text, slots под action/autosave/queue status, disabled mutation buttons, отсутствие horizontal overflow и PWA flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Скриншоты сохранены:
  - `/private/tmp/mediahub-ui10an-content-390.png`;
  - `/private/tmp/mediahub-ui10an-content-1440.png`.
- `next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: checks=69, files=469, errors=0.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Следующий рекомендуемый slice

UI Phase 10ao: подключить durable queue UI для repeatable group creation failures в `AddRepeatableGroupActionForm`, используя новый repeatable queue contract.
