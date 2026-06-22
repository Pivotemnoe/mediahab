# UI Phase 10as — отчёт

## Что сделано

- Добавлена безопасная русская diagnostic строка для guided queue в shell/offline banner.
- Diagnostic показывает только счётчики состава очереди:
  - поля;
  - группы полей;
  - неопознанные/legacy изменения;
  - сколько можно повторить;
  - сколько требует обновления.
- Queued payload values, draft text, cookies, tokens и credentials не выводятся.
- Empty fixture mode визуально не меняется: если shell/offline banner не нужен, diagnostic строка не рендерится.
- Automatic replay и background sync не включались.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AS_GUIDED_QUEUE_SAFE_DIAGNOSTICS.md`
- Создан: `docs/exec-plans/UI_PHASE_10AS_REPORT_RU.md`
- Создан: `apps/web/src/services/guided-queue-diagnostics.ts`
- Создан: `tools/check_guided_queue_diagnostics.mjs`
- Изменён: `apps/web/src/components/pwa/offline-status.tsx`
- Изменён: `Makefile`

## Результаты focused checks

- `node tools/check_guided_queue_diagnostics.mjs` — пройден.
- `make typecheck` — пройден.
- `make test-ui-hardening` — пройден.

Новый harness проверяет:

- empty summary возвращает `null`;
- русские plural forms для field, repeatable group, unknown и blocked/retryable counts;
- diagnostic не содержит sample queued values: `Черновик`, `secret`, `legacy`, `unclassified`.

## Полный gate

- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- Visual smoke `/app/content/demo-review` — пройден на 390px и 1440px через isolated Playwright/Chrome context с `serviceWorkers: "block"`.
  Проверены русские guided-form тексты, disabled mutation buttons, отсутствие horizontal overflow, отсутствие diagnostic строки на empty fixture queue и PWA dataset flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Seeded visual smoke с mixed local guided queue — пройден на 390px.
  Проверены shell banner `Есть несинхронизированные изменения: 4.`, diagnostic строка `Состав очереди: 1 поле, 1 группа полей, 2 неопознанных изменения; 2 можно повторить, 1 требует обновления.` и отсутствие queued values в видимом тексте.
- Скриншоты сохранены:
  - `/private/tmp/mediahub-ui10as-content-390.png`;
  - `/private/tmp/mediahub-ui10as-content-1440.png`;
  - `/private/tmp/mediahub-ui10as-content-seeded-390.png`.
- `next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: checks=69, files=483, errors=0.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. Automatic replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
2. Safe manual replay execution flow требует отдельного среза и подтверждения cookie/CSRF strategy.
3. Diagnostic показывает только composition counts; merge UI для `version_conflict` и live STT/upload остаются вне этого slice.

## Следующий рекомендуемый slice

UI Phase 10at: API-mode repeatable queue failure browser/harness или safe manual replay execution flow после подтверждения cookie/CSRF strategy.
