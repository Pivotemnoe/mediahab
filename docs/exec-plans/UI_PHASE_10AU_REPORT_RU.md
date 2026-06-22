# UI Phase 10au — отчёт

## Что сделано

- `QueueStatusLine` получил type-aware русскую copy для локальной guided queue.
- Repeatable group jobs больше не описываются как `несинхронизированное поле`.
- Для repeatable jobs добавлены отдельные сообщения:
  - blocked/refresh: `В очереди есть несинхронизированное добавление позиции...`;
  - queued/retry: `Есть несинхронизированное добавление позиции в этом браузере.`
- Field и unknown/legacy jobs сохраняют отдельные fallback-сообщения.
- Runtime replay policy, backend API, OpenAPI и миграции не менялись.

## Зачем это нужно

UI Phase 10at закрепил, что repeatable group stale-version API call возвращает `version_conflict`. В таком состоянии локальная очередь становится blocked/refresh. Теперь локальный status line корректно объясняет пользователю, что заблокировано добавление позиции, а не обычное поле.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AU_REPEATABLE_QUEUE_BLOCKED_COPY.md`
- Создан: `docs/exec-plans/UI_PHASE_10AU_REPORT_RU.md`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`
- Изменён: `tools/check_guided_repeatable_queue_ui.mjs`

## Результаты focused checks

- `node tools/check_guided_repeatable_queue_ui.mjs` — пройден.
- `make typecheck` — пройден.
- `make test-ui-hardening` — пройден.

Harness проверяет:

- наличие `queueStatusLabel`;
- repeatable-specific blocked/queued copy;
- сохранение field fallback copy;
- отсутствие sample queued values: `Черновик`, `secret`, `legacy`, `unclassified`.

## Полный gate

- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- Visual smoke `/app/content/demo-review` — пройден на 390px и 1440px через isolated Playwright/Chrome context с `serviceWorkers: "block"`.
  Проверены русские guided-form тексты, disabled mutation buttons, отсутствие horizontal overflow и PWA dataset flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Скриншоты сохранены:
  - `/private/tmp/mediahub-ui10au-content-390.png`;
  - `/private/tmp/mediahub-ui10au-content-1440.png`.
- `next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: checks=69, files=487, errors=0.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. Automatic replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
2. Safe manual replay execution flow требует отдельного среза и подтверждения cookie/CSRF strategy.
3. Merge UI для `version_conflict`, live STT/upload и production launch hardening остаются вне этого slice.

## Следующий рекомендуемый slice

UI Phase 10av: добавить более явный conflict recovery surface для blocked repeatable queue или перейти к safe manual replay execution design после подтверждения cookie/CSRF strategy.
