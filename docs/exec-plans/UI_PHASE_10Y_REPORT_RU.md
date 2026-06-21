# UI Phase 10y — отчёт

## Что сделано

- Добавлен public service-worker capability manifest: `apps/web/public/sw-capabilities.json`.
- Manifest явно фиксирует текущее состояние PWA:
  - service worker script: `/sw.js`;
  - strategy: `shell-get-cache`;
  - `mutationReplay=false`;
  - `backgroundSync=false`;
  - guided-form queue replay policy: `manual_retry_required`;
  - reason: `http_only_cookie_csrf_required`.
- `PwaRuntime` теперь best-effort загружает manifest и выставляет debug-safe dataset flags:
  - `data-service-worker-capabilities`;
  - `data-service-worker-mutation-replay`;
  - `data-service-worker-background-sync`;
  - `data-guided-queue-replay`.
- Добавлен deterministic check: `tools/check_sw_capabilities.mjs`.
- Check сверяет manifest и `sw.js`: cache name, shell URLs, non-GET early return, отсутствие `sync`/`periodicsync` handlers и отсутствие mutation fetch.

## Противоречия и открытые вопросы

1. Это не service-worker/background-sync replay. Manifest намеренно заявляет, что mutation replay недоступен.
2. `PwaRuntime` выставляет dataset flags для smoke/debug, но не показывает новый видимый UI.
3. Для включения replay нужен отдельный slice с authenticated API-mode smoke, HttpOnly cookie/CSRF strategy и version-conflict правилами.

## Созданные и изменённые файлы

- Создан: `apps/web/public/sw-capabilities.json`
- Создан: `tools/check_sw_capabilities.mjs`
- Создан: `docs/exec-plans/UI_PHASE_10Y_SERVICE_WORKER_CAPABILITIES.md`
- Создан: `docs/exec-plans/UI_PHASE_10Y_REPORT_RU.md`
- Изменён: `apps/web/src/components/pwa/pwa-runtime.tsx`

## Результаты тестов и проверок

- `node tools/check_sw_capabilities.mjs` — пройден.
- `node tools/check_guided_queue_replay.mjs` — пройден.
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
- Скриншоты сохранены как `/private/tmp/mediahub-ui10y-content-390.png` и `/private/tmp/mediahub-ui10y-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=431 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10z: authenticated API-mode smoke для guided-form autosave/conflict/retry path или service-worker build pipeline planning без включения mutation replay.
