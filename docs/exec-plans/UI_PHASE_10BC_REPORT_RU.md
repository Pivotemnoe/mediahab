# UI Phase 10bc — отчёт

## Статус

Завершено.

## Что сделано

- В `QueueStatusLine` добавлен двухшаговый confirmation shell для retry-safe guided queue jobs.
- Кнопка `Повторить из очереди` теперь сначала открывает подтверждение, а не сразу вызывает текущий submit retry path.
- Confirmation shell показывает:
  - что форма отправит текущие значения через безопасное сохранение;
  - что сохранённые значения очереди не показываются;
  - safe preflight route/status из UI Phase 10bb.
- Для `recoveryAction=refresh` поведение не изменено: показывается только обновление страницы, retry shell не открывается.
- Добавлены DOM hooks:
  - `data-guided-queue-retry-shell`;
  - `data-testid="guided-queue-retry-arm"`;
  - `data-testid="guided-queue-retry-shell"`;
  - `data-testid="guided-queue-retry-confirm"`;
  - `data-testid="guided-queue-retry-cancel"`.
- Добавлен reusable fixture visual smoke tool `tools/check_content_fixture_visual_smoke.mjs`.
- Source-level hardening checks и API-mode seeded smoke обновлены под confirmation shell.

## Проверки

- `node tools/check_guided_queue_replay_preflight.mjs` — пройден.
- `make test-ui-hardening` — пройден.
- `node tools/check_guided_queue_api_seeded_smoke.mjs` — пройден:
  - 390px: `retryShellStatus=confirm`, `retryShellClosedAfterCancel=true`, `preflightStatus=ready`, `preflightRoute=repeatable_group`;
  - 1440px: `retryShellStatus=confirm`, `retryShellClosedAfterCancel=true`, `preflightStatus=ready`, `preflightRoute=repeatable_group`.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 routes.
- Fixture visual smoke `/app/content/demo-review` — пройден через headless Chrome CDP:
  - `/private/tmp/mediahub-ui10bc-content-390.png`;
  - `/private/tmp/mediahub-ui10bc-content-1440.png`.
- Fixture visual smoke подтвердил `main`, guided field form, repeatable-group form, queue status slot, preflight hook, retry shell hook, disabled mutation buttons и отсутствие horizontal overflow.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.
- `make validate-spec` — пройден: `checks=69 files=509 errors=0`.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend product API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. Confirmation shell не выполняет direct browser API replay и не отправляет сохранённое тело очереди.
2. Confirm использует существующий safe form submit retry path с HttpOnly cookie/CSRF через server actions.
3. Automatic replay/background sync по-прежнему выключены.
4. Merge UI для `version_conflict` не реализован.
5. Production deployment на `temichev-posthub.ru` остаётся заблокирован HTTPS/TLS и отсутствующим рабочим SSH/серверным доступом.
6. Live Telegram/MAX/Instagram/OpenAI/S3 credentials для пилота ещё требуют ответов владельца.

## Следующий рекомендуемый slice

UI Phase 10bd: pilot-readiness cockpit для owner-facing checklist по серверу, OpenAI, S3 и Telegram, либо deployment slice после выдачи рабочего SSH-доступа и production env решений.
