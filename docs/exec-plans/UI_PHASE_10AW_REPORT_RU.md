# UI Phase 10aw — отчёт

## Что сделано

- В `QueueStatusLine` добавлены стабильные DOM hooks:
  - `data-testid="guided-queue-status"`;
  - `data-guided-queue-status`;
  - `data-guided-queue-kind`;
  - `data-guided-queue-recovery`.
- Для recovery controls добавлены стабильные test ids:
  - `guided-queue-refresh`;
  - `guided-queue-retry`;
  - `guided-queue-clear`.
- Видимый русский UI, backend API, OpenAPI, runtime replay policy и миграции не менялись.
- Hooks не включают queued payload values, request id, content id, cookies, CSRF token или другие чувствительные данные.

## Зачем это нужно

UI Phase 10av добавил кнопку `Обновить страницу` для blocked refresh-required queue jobs. Следующий API-mode browser smoke должен уметь seeded localStorage job проверить через стабильные selectors, а не через хрупкий поиск текста. Этот slice готовит такой DOM contract без включения automatic replay.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AW_GUIDED_QUEUE_DOM_HOOKS.md`
- Создан: `docs/exec-plans/UI_PHASE_10AW_REPORT_RU.md`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`
- Изменён: `tools/check_guided_repeatable_queue_ui.mjs`
- Обновлены validation artifacts: `SPEC_MANIFEST.json`, `reference/VALIDATION_REPORT.md`

## Результаты focused checks

- `node tools/check_guided_repeatable_queue_ui.mjs` — пройден.
- `make typecheck` — пройден.
- `make test-ui-hardening` — пройден.

Harness проверяет:

- `QueueStatusLine` содержит status/kind/recovery DOM hooks;
- refresh/retry/clear controls имеют стабильные test ids;
- refresh-required jobs по-прежнему используют `refreshPage`;
- queue status DOM hooks не содержат sample queued values: `Черновик`, `secret`, `legacy`, `unclassified`.

## Проверки

- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- Visual smoke `/app/content/demo-review` — пройден через headless Chrome CDP:
  - `/private/tmp/mediahub-ui10aw-content-390.png`;
  - `/private/tmp/mediahub-ui10aw-content-1440.png`.
- Visual smoke подтвердил `main`, guided field group, repeatable-group slot, action/autosave/queue status slots, disabled mutation buttons в fixture mode, service-worker flags, отсутствие horizontal overflow на 390px и 1440px, а также наличие `guided-queue-status` DOM hooks.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: `checks=69 files=491 errors=0`.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. API-mode browser-seeded smoke для blocked repeatable queue ещё не реализован; этот slice подготовил стабильные DOM hooks.
2. Automatic replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
3. Safe manual replay execution flow требует отдельного среза и подтверждения cookie/CSRF strategy.

## Следующий рекомендуемый slice

UI Phase 10ax: authenticated/API-mode browser-seeded smoke для blocked repeatable queue refresh surface с реальным content item и seeded `tmh:guided-form-queue:v1:repeatable:<contentId>:dishes:new`.
