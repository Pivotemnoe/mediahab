# UI Phase 10bb — отчёт

## Что сделано

- В `QueueStatusLine` добавлена safe preflight строка для guided-form local queue jobs.
- Preflight показывает:
  - готовность (`ready` или `incomplete`);
  - безопасный route class (`repeatable_group`, `field_block`, `field_item`, `incomplete`);
  - HTTP method и route template для готового запроса.
- Preflight явно говорит, что запрос только подготовлен локально, значения скрыты и запрос не отправлен.
- Добавлены DOM hooks:
  - `data-guided-queue-preflight`;
  - `data-guided-queue-preflight-route`;
  - `data-testid="guided-queue-preflight"`.
- Добавлен source-level harness `tools/check_guided_queue_replay_preflight.mjs`, подключён в `make test-ui-hardening`.
- API-mode seeded smoke теперь проверяет, что blocked repeatable queue показывает `preflightStatus=ready`, `preflightRoute=repeatable_group` и не раскрывает queued values.
- Automatic replay/background sync не включались; backend mutation из очереди не выполняется.

## Изменённые файлы

- `apps/web/src/components/phase04/guided-form-actions.tsx`
- `tools/check_guided_queue_replay_preflight.mjs`
- `tools/check_guided_queue_api_seeded_smoke.mjs`
- `Makefile`
- `docs/exec-plans/UI_PHASE_10BB_GUIDED_QUEUE_PREFLIGHT.md`
- `docs/exec-plans/UI_PHASE_10BB_REPORT_RU.md`
- validation artifacts после `make validate-spec`

## Проверки

- `node tools/check_guided_queue_replay_preflight.mjs` — пройден.
- `make test-ui-hardening` — пройден, включая новый preflight harness.
- `node tools/check_guided_queue_api_seeded_smoke.mjs` — пройден:
  - 390px: `preflightStatus=ready`, `preflightRoute=repeatable_group`, `refreshPreservedStorage=true`, `clearRemovedStorage=true`;
  - 1440px: `preflightStatus=ready`, `preflightRoute=repeatable_group`, `refreshPreservedStorage=true`, `clearRemovedStorage=true`.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 routes.
- Fixture visual smoke `/app/content/demo-review` — пройден через headless Chrome CDP:
  - `/private/tmp/mediahub-ui10bb-content-390.png`;
  - `/private/tmp/mediahub-ui10bb-content-1440.png`.
- Fixture visual smoke подтвердил `main`, guided field group, repeatable-group slot, action/autosave/queue status slots, disabled mutation buttons, service-worker flags, guided queue replay flag, отсутствие horizontal overflow и наличие queue status slots.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.
- `make validate-spec` — пройден: `checks=69 files=506 errors=0`.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend product API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. Preflight не выполняет replay и не отправляет queued request.
2. Automatic replay/background sync по-прежнему выключены.
3. Merge UI для `version_conflict` не реализован.
4. Production split-domain cookie/CSRF strategy остаётся отдельным решением.
5. `temichev-posthub.ru` всё ещё требует HTTPS/certificate setup и рабочий SSH/серверный доступ перед выкладкой.

## Следующий рекомендуемый slice

UI Phase 10bc: manual replay execution confirmation shell для retry-safe queue jobs без автоматического background replay, либо deployment slice после выдачи рабочего SSH-доступа для `temichev-posthub.ru`.
