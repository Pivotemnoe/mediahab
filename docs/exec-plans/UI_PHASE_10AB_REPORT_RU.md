# UI Phase 10ab — отчёт

## Что сделано

- Error mapping для guided-form server actions вынесен из `content-actions.ts` в отдельный helper `guided-action-errors.ts`.
- `saveGuidedFieldAction` и `addRepeatableGroupAction` сохранили прежнее поведение: API errors возвращаются как `GuidedActionState`, raw exception наружу не пробрасывается.
- Добавлен focused harness `tools/check_guided_action_errors.mjs`, который проверяет реальные русские сообщения и recovery-политику:
  - `csrf_required` и `csrf_invalid` требуют обновить страницу;
  - `version_conflict` требует обновить страницу и остаётся warning;
  - backend/server errors остаются retryable;
  - non-API failure возвращает `api_unavailable`.
- `make test-ui-hardening` теперь запускает три UI hardening checks:
  - service worker capabilities;
  - guided queue replay readiness;
  - guided action error mapping.

## Противоречия и открытые вопросы

1. Это не live authenticated API-mode smoke.
2. Split-domain deployment всё ещё требует подтверждения cookie/domain strategy для Next server actions и backend CSRF.
3. Automatic replay guided-form queue остаётся выключенным: mutations требуют HttpOnly cookie/CSRF контекст, который service worker безопасно не воспроизводит.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AB_GUIDED_ACTION_ERROR_MAPPING.md`
- Создан: `docs/exec-plans/UI_PHASE_10AB_REPORT_RU.md`
- Создан: `apps/web/src/services/guided-action-errors.ts`
- Создан: `tools/check_guided_action_errors.mjs`
- Изменён: `apps/web/src/services/content-actions.ts`
- Изменён: `Makefile`

## Результаты тестов и проверок

- `make test-ui-hardening` — пройден.
- `make test` — пройден:
  - service worker capability checks — пройдены;
  - guided queue replay readiness checks — пройдены;
  - guided action error mapping checks — пройдены;
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
- Скриншоты сохранены как `/private/tmp/mediahub-ui10ab-content-390.png` и `/private/tmp/mediahub-ui10ab-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=439 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10ac: authenticated API-mode smoke для guided-form save/conflict/retry path, если доступна локальная backend-сессия и CSRF cookie strategy.
