# UI Phase 10ap — отчёт

## Что сделано

- Добавлен deterministic hardening harness `tools/check_guided_repeatable_queue_ui.mjs`.
- Harness проверяет source-level wiring repeatable queue UI:
  - наличие `repeatableGroupQueueMetadata`;
  - чтение `contentId`, `groupKey`, `intent`, `sourceType`;
  - metadata kind `repeatable_group`;
  - подключение `useGuidedQueue` в `AddRepeatableGroupActionForm`;
  - использование `guidedRepeatableGroupQueueKey`;
  - отрисовку `QueueStatusLine`;
  - ручной retry через hidden native submit buttons для `save` и `lock`.
- `make test-ui-hardening` теперь запускает новый harness.
- Runtime UX, backend API, automatic replay и fixture mode не менялись.

## Противоречия и открытые вопросы

1. Harness закрепляет wiring, но не заменяет live failure/retry smoke в настоящем API-mode браузере.
2. Automatic replay всё ещё выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
3. Safe manual replay execution flow требует отдельного среза и подтверждения cookie/CSRF strategy.
4. Merge UI для `version_conflict`, live STT/upload и publication flow остаются открытыми частями полного ТЗ.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AP_GUIDED_REPEATABLE_QUEUE_HARNESS.md`
- Создан: `docs/exec-plans/UI_PHASE_10AP_REPORT_RU.md`
- Создан: `tools/check_guided_repeatable_queue_ui.mjs`
- Изменён: `Makefile`

## Результаты тестов и проверок

- `node tools/check_guided_repeatable_queue_ui.mjs` — пройден.
- `make test-ui-hardening` — пройден.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- Visual smoke `/app/content/demo-review` — пройден на 390px и 1440px через isolated Playwright/Chrome context с `serviceWorkers: "block"`.
  Проверены `main`, guided-form text, repeatable queue status slots, disabled mutation buttons, отсутствие horizontal overflow и PWA flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Скриншоты сохранены:
  - `/private/tmp/mediahub-ui10ap-content-390.png`;
  - `/private/tmp/mediahub-ui10ap-content-1440.png`.
- `next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: checks=69, files=474, errors=0.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Следующий рекомендуемый slice

UI Phase 10aq: API-mode browser/harness для repeatable queue failure path или safe manual replay execution flow после подтверждения cookie/CSRF strategy.
