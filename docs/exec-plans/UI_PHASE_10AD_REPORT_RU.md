# UI Phase 10ad — отчёт

## Что сделано

- Добавлен dedicated authenticated API-mode smoke `tools/check_guided_form_api_mode.py`.
- Smoke поднимает in-process FastAPI app с временной SQLite базой и проверяет полный guided-form mutation path:
  - регистрация пользователя;
  - наличие `tmh_session` и `tmh_csrf` cookies;
  - отказ cookie-authenticated mutation без CSRF header с `csrf_required`;
  - импорт preset-проекта;
  - создание материала;
  - чтение `/guided-form`;
  - сохранение и фиксация `venue_name`;
  - stale update с `version_conflict`;
  - добавление repeatable group `dishes`;
  - появление locked facts.
- `make test-ui-hardening` теперь запускает пять checks:
  - service worker capabilities;
  - guided queue replay readiness;
  - guided action error mapping;
  - API request header contract;
  - guided-form API-mode smoke.

## Противоречия и открытые вопросы

1. Это in-process API smoke, а не browser-level Next server action smoke.
2. Split-domain deployment всё ещё требует отдельного cookie/domain/SameSite/CSRF решения.
3. Service worker mutation replay остаётся выключенным: authenticated guided-form mutations идут через обычный server-action/API path.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AD_GUIDED_FORM_API_MODE_SMOKE.md`
- Создан: `docs/exec-plans/UI_PHASE_10AD_REPORT_RU.md`
- Создан: `tools/check_guided_form_api_mode.py`
- Изменён: `Makefile`

## Результаты тестов и проверок

- `make test-ui-hardening` — пройден.
- `make test` — пройден:
  - service worker capability checks — пройдены;
  - guided queue replay readiness checks — пройдены;
  - guided action error mapping checks — пройдены;
  - API request header contract checks — пройдены;
  - guided-form API-mode smoke — пройден;
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
- Скриншоты сохранены как `/private/tmp/mediahub-ui10ad-content-390.png` и `/private/tmp/mediahub-ui10ad-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=445 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10ae: browser-level authenticated API-mode smoke для Next guided-form server actions, используя локальный backend/API session и уже зафиксированные CSRF/header/API-mode contracts.
