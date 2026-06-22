# UI Phase 10ba — отчёт

## Что сделано

- Добавлен public-domain readiness runbook для `temichev-posthub.ru`: `docs/runbooks/public-domain-readiness-ru.md`.
- Добавлен read-only diagnostic tool: `tools/check_public_domain_readiness.mjs`.
- `docs/runbooks/README.md` теперь ссылается на новый runbook.
- `docs/OPEN_QUESTIONS.md` дополнен фактом: non-interactive SSH probe к `root@89.169.46.92` сейчас не проходит (`Permission denied (publickey,password)`).
- Runbook фиксирует предпочтительную первую topology: same-site deployment на `https://temichev-posthub.ru` и API под `/api/v1`, чтобы не усложнять HttpOnly cookies, SameSite и CSRF до подтверждения split-domain стратегии.
- Продуктовый frontend/backend код, API contracts, миграции, OpenAPI и typed client не менялись.

## Что показала диагностика домена

- `node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru --allow-https-failure` — пройден вне network sandbox:
  - `httpRedirectsToHttps=true`;
  - HTTP status `308`;
  - redirect location `https://temichev-posthub.ru/`;
  - `httpsAvailable=false`;
  - blocker: `https_unavailable`;
  - HTTPS ошибка: TLS internal error.
- `ssh -4 -o BatchMode=yes -o ConnectTimeout=10 root@89.169.46.92 ...` — не прошёл: `Permission denied (publickey,password)`.
- Выкладка пока не готова: нужен рабочий HTTPS/certificate/virtual host и рабочий SSH/серверный доступ или owner-side выполнение команд.

## Проверки

- `node tools/check_public_domain_readiness.mjs --help` — пройден.
- `node tools/check_public_domain_readiness.mjs --domain temichev-posthub.ru --allow-https-failure` — пройден вне sandbox, текущий blocker `https_unavailable` подтверждён.
- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 routes.
- Fixture visual smoke `/app/content/demo-review` — пройден через headless Chrome CDP:
  - `/private/tmp/mediahub-ui10ba-content-390.png`;
  - `/private/tmp/mediahub-ui10ba-content-1440.png`.
- Fixture visual smoke подтвердил `main`, guided field group, repeatable-group slot, action/autosave/queue status slots, disabled mutation buttons, service-worker flags, guided queue replay flag, отсутствие horizontal overflow и наличие queue status slots.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.
- `make validate-spec` — пройден: `checks=69 files=503 errors=0`.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend product API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. `temichev-posthub.ru` ещё не готов к публичной выкладке: HTTPS/certificate setup падает с TLS internal error.
2. Non-interactive SSH-доступ с этой машины сейчас не подтверждён.
3. Production email provider, backup/restore drill, S3 production параметры, secret storage, RLS acceptance и live connector credentials остаются launch blockers.
4. Split-domain cookie/CSRF strategy не решалась; для первого pilot runbook рекомендует same-site deployment.

## Следующий рекомендуемый slice

UI Phase 10bb: либо safe manual replay execution preflight для guided queue, либо deployment slice после выдачи рабочего SSH-доступа/серверных команд для настройки Caddy TLS на `temichev-posthub.ru`.
