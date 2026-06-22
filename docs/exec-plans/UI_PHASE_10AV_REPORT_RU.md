# UI Phase 10av — отчёт

## Что сделано

- В `QueueStatusLine` добавлена кнопка `Обновить страницу` для blocked local queue jobs с `recoveryAction === "refresh"`.
- Retry-required queue jobs продолжают показывать `Повторить из очереди`; refresh-required jobs не показывают retry-кнопку.
- Control использует существующий `refreshPage` и не отправляет queued job на backend.
- Runtime replay policy, backend API, OpenAPI и миграции не менялись.

## Зачем это нужно

После `version_conflict` или CSRF/session recovery локальная очередь может остаться в blocked состоянии. Раньше в queue surface была только возможность очистить очередь, хотя правильное действие — обновить страницу и получить актуальную версию материала. Теперь refresh recovery доступен прямо там, где пользователь видит blocked queue.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AV_BLOCKED_QUEUE_REFRESH_CONTROL.md`
- Создан: `docs/exec-plans/UI_PHASE_10AV_REPORT_RU.md`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`
- Изменён: `tools/check_guided_repeatable_queue_ui.mjs`

## Результаты focused checks

- `node tools/check_guided_repeatable_queue_ui.mjs` — сначала выявил ограничение source parser для destructured `QueueStatusLine`, harness исправлен.
- `node tools/check_guided_repeatable_queue_ui.mjs` — пройден.
- `make typecheck` — пройден.
- `make test-ui-hardening` — пройден.

Harness проверяет:

- `canRetryJob` исключает `recoveryAction === "refresh"`;
- `canRefreshJob` включается только для `status === "blocked"` и `recoveryAction === "refresh"`;
- кнопка вызывает `refreshPage`;
- в queue UI остаются и `Обновить страницу`, и `Повторить из очереди` для разных recovery paths.

## Полный gate

- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- Visual smoke `/app/content/demo-review` — пройден через headless Chrome CDP:
  - `/private/tmp/mediahub-ui10av-content-390.png`;
  - `/private/tmp/mediahub-ui10av-content-1440.png`.
- Visual smoke подтвердил `main`, guided field group, repeatable-group slot, action/autosave/queue status slots, disabled mutation buttons в fixture mode, service-worker flags, отсутствие horizontal overflow на 390px и 1440px.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: `checks=69 files=489 errors=0`.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. Automatic replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
2. Safe manual replay execution flow требует отдельного среза и подтверждения cookie/CSRF strategy.
3. Merge UI для `version_conflict`, live STT/upload и production launch hardening остаются вне этого slice.

## Следующий рекомендуемый slice

UI Phase 10aw: browser-seeded smoke для blocked repeatable queue refresh surface или safe manual replay execution design после подтверждения cookie/CSRF strategy.
