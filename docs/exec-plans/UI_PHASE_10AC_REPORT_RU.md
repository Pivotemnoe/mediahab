# UI Phase 10ac — отчёт

## Что сделано

- Header/CSRF сборка для frontend `apiRequest` вынесена в явный helper `createApiRequestHeaders`.
- Сохранено прежнее поведение `apiRequest`:
  - browser cookies из Next server action контекста forward'ятся в backend как `Cookie`;
  - JSON mutations получают `Content-Type: application/json`;
  - CSRF-protected mutations получают `X-CSRF-Token` или имя из `CSRF_HEADER_NAME`;
  - при отсутствии CSRF token mutation падает локально с `csrf_required` до сетевого запроса.
- Добавлен focused harness `tools/check_api_request_headers.mjs`.
- `make test-ui-hardening` теперь запускает четыре UI/API boundary checks:
  - service worker capabilities;
  - guided queue replay readiness;
  - guided action error mapping;
  - API request header contract.

## Противоречия и открытые вопросы

1. Это ещё не live authenticated API-mode smoke.
2. Split-domain deployment всё ещё требует отдельного решения по cookie domain/SameSite/CSRF strategy.
3. Service worker mutation replay остаётся выключенным: HttpOnly session cookie и CSRF контекст должны идти через обычный authenticated server-action path.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AC_API_REQUEST_CSRF_CONTRACT.md`
- Создан: `docs/exec-plans/UI_PHASE_10AC_REPORT_RU.md`
- Создан: `tools/check_api_request_headers.mjs`
- Изменён: `apps/web/src/services/runtime.ts`
- Изменён: `Makefile`

## Результаты тестов и проверок

- `make test-ui-hardening` — пройден.
- `make test` — пройден:
  - service worker capability checks — пройдены;
  - guided queue replay readiness checks — пройдены;
  - guided action error mapping checks — пройдены;
  - API request header contract checks — пройдены;
  - общие tests: 5;
  - API tests: 42.
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
- Скриншоты сохранены как `/private/tmp/mediahub-ui10ac-content-390.png` и `/private/tmp/mediahub-ui10ac-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=442 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10ad: authenticated API-mode smoke для guided-form save/conflict/retry path на локальном backend, используя зафиксированный Cookie + CSRF forwarding contract.
