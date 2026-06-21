# UI Phase 10w — отчёт

## Что сделано

- Добавлен replay readiness boundary: `apps/web/src/services/guided-queue-replay.ts`.
- Новый модуль явно описывает текущую политику guided-form queue:
  - `canAutoReplay=false`;
  - пустая очередь не показывает shell banner;
  - offline state показывает, что ИИ и публикации недоступны;
  - online queued state показывает, что автоповтор выключен и нужно открыть материал для ручного retry.
- `OfflineStatus` теперь получает shell copy и статус из readiness module, а не держит replay policy внутри компонента.
- App shell по-прежнему показывает только агрегированное состояние, без queued field values, cookies, CSRF tokens, bearer tokens или credentials.

## Противоречия и открытые вопросы

1. Это не service-worker/background-sync replay. Автоматический replay остаётся выключенным до authenticated API-mode smoke, cookie/CSRF стратегии и version-conflict правил.
2. `public/sw.js` остаётся статическим GET-cache service worker и не импортирует frontend source modules.
3. In-app browser smoke не записывает localStorage queue из-за browser security policy, поэтому queued online shell copy проверена статически через type/build и будет полноценно проверяться в API-mode или отдельном разрешённом browser harness.

## Созданные и изменённые файлы

- Создан: `apps/web/src/services/guided-queue-replay.ts`
- Создан: `docs/exec-plans/UI_PHASE_10W_GUIDED_QUEUE_REPLAY_READINESS.md`
- Создан: `docs/exec-plans/UI_PHASE_10W_REPORT_RU.md`
- Изменён: `apps/web/src/components/pwa/offline-status.tsx`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через in-app browser — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke подтвердил наличие `main`, guided field group, repeatable-group slot, action/autosave/queue status slots, disabled mutation buttons в fixture mode, отсутствие replay banner без queue jobs и отсутствие horizontal overflow.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10w-content-390.png` и `/private/tmp/mediahub-ui10w-content-1440.png`.
- `make validate-spec` — пройден: `checks=68 files=424 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10x: добавить разрешённый deterministic browser/unit harness для guided queue readiness states или перейти к authenticated API-mode smoke для autosave/conflict/retry path.
