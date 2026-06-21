# UI Phase 10ae — отчёт

## Что сделано

- Payload contract guided-form server actions вынесен из `content-actions.ts` в `guided-action-payloads.ts`.
- `content-actions.ts` теперь отвечает за server action orchestration: построить payload, вызвать `apiRequest`, выполнить `revalidatePath`, вернуть `GuidedActionState`.
- Добавлен focused harness `tools/check_guided_action_payloads.mjs`.
- Harness проверяет:
  - save existing block: `PATCH /api/v1/content-blocks/{blockId}`;
  - save new field: `PUT /api/v1/content-items/{contentId}/blocks/{fieldKey}`;
  - `intent=lock` и success copy для фиксации;
  - default `source_type=user_text`;
  - `version` parsing;
  - repeatable group `field:*` mapping;
  - missing required hidden fields.
- `make test-ui-hardening` теперь запускает шесть checks:
  - service worker capabilities;
  - guided queue replay readiness;
  - guided action error mapping;
  - guided action payload contract;
  - API request header contract;
  - guided-form API-mode smoke.

## Противоречия и открытые вопросы

1. Это payload-level server-action contract, а не browser-level authenticated Next action smoke.
2. Split-domain deployment всё ещё требует отдельного cookie/domain/SameSite/CSRF решения.
3. Repeatable group values в текущем UI slice остаются text DTO; более точная money/media типизация может потребовать отдельного frontend mapping slice.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AE_GUIDED_ACTION_PAYLOAD_CONTRACT.md`
- Создан: `docs/exec-plans/UI_PHASE_10AE_REPORT_RU.md`
- Создан: `apps/web/src/services/guided-action-payloads.ts`
- Создан: `tools/check_guided_action_payloads.mjs`
- Изменён: `apps/web/src/services/content-actions.ts`
- Изменён: `Makefile`

## Результаты тестов и проверок

- `make test-ui-hardening` — пройден.
- `make test` — пройден:
  - service worker capability checks — пройдены;
  - guided queue replay readiness checks — пройдены;
  - guided action error mapping checks — пройдены;
  - guided action payload contract checks — пройдены;
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
- Скриншоты сохранены как `/private/tmp/mediahub-ui10ae-content-390.png` и `/private/tmp/mediahub-ui10ae-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=449 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10af: browser-level authenticated API-mode smoke для Next guided-form server actions или, если live browser session остаётся слишком тяжёлой, отдельный slice для type-aware repeatable field DTO mapping.
