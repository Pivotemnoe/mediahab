# UI Phase 10z — отчёт

## Что сделано

- Добавлен Make target `test-ui-hardening`.
- Target запускает оба deterministic PWA/offline safety checks:
  - `node tools/check_sw_capabilities.mjs`;
  - `node tools/check_guided_queue_replay.mjs`.
- Target зависит от `deps`, как и остальные основные Make-проверки.
- Видимый UI, backend API, OpenAPI и миграции не менялись.

## Противоречия и открытые вопросы

1. Это не authenticated API-mode smoke и не browser-level queue replay test.
2. `test-ui-hardening` не заменяет `make typecheck`, `make lint`, build или visual smoke; это отдельный lightweight safety gate.
3. Полноценный automatic replay остаётся выключенным до cookie/CSRF strategy, authenticated API-mode smoke и version-conflict правил.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10Z_UI_HARDENING_CHECK_TARGET.md`
- Создан: `docs/exec-plans/UI_PHASE_10Z_REPORT_RU.md`
- Изменён: `Makefile`

## Результаты тестов и проверок

- `make test-ui-hardening` — пройден.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через in-app browser — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke подтвердил наличие `main`, guided field group, repeatable-group slot, action/autosave/queue status slots, disabled mutation buttons в fixture mode, отсутствие horizontal overflow и dataset flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10z-content-390.png` и `/private/tmp/mediahub-ui10z-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=433 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

Следующий шаг лучше делать уже не очередным guardrail, а live/API integration: UI Phase 10aa — authenticated API-mode smoke для guided-form autosave/conflict/retry path, если доступна локальная backend-сессия и CSRF cookie strategy.
