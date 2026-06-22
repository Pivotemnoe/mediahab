# UI Phase 10az — отчёт

## Что сделано

- Расширен API-mode seeded browser smoke `tools/check_guided_queue_api_seeded_smoke.mjs`.
- Smoke теперь проверяет полный безопасный refresh recovery path для blocked repeatable queue:
  - blocked queue status и кнопка `Обновить страницу` отображаются в API mode;
  - click по `guided-queue-refresh` выполняет настоящий browser reload;
  - localStorage queue job остаётся после reload;
  - blocked repeatable queue status и refresh control снова отображаются после reload;
  - затем существующая проверка `Очистить локальную очередь` по-прежнему удаляет job и возвращает queue в empty state.
- Automatic replay/background sync не включались, queued mutation в backend не отправляется.
- Backend product routes, OpenAPI, typed client, миграции, runtime replay policy и пользовательская UI copy не менялись.
- По новому сообщению владельца зафиксирован deployment note: production-domain candidate `temichev-posthub.ru`, HTTP отвечает Caddy redirect на HTTPS, HTTPS сейчас требует настройки сертификата/virtual host.

## Изменённые файлы

- `tools/check_guided_queue_api_seeded_smoke.mjs`
- `docs/exec-plans/UI_PHASE_10AZ_BLOCKED_QUEUE_REFRESH_SMOKE.md`
- `docs/exec-plans/UI_PHASE_10AZ_REPORT_RU.md`
- `docs/OPEN_QUESTIONS.md`
- validation artifacts после `make validate-spec`

## Проверки

- `node tools/check_guided_queue_api_seeded_smoke.mjs` — пройден:
  - 390px: `refreshPreservedStorage=true`, `clearRemovedStorage=true`, screenshot `/private/tmp/mediahub-ui10ax-api-seeded-390.png`;
  - 1440px: `refreshPreservedStorage=true`, `clearRemovedStorage=true`, screenshot `/private/tmp/mediahub-ui10ax-api-seeded-1440.png`.
- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 routes.
- Fixture visual smoke `/app/content/demo-review` — пройден через headless Chrome CDP:
  - `/private/tmp/mediahub-ui10az-content-390.png`;
  - `/private/tmp/mediahub-ui10az-content-1440.png`.
- Fixture visual smoke подтвердил `main`, guided field group, repeatable-group slot, action/autosave/queue status slots, disabled mutation buttons, service-worker flags, guided queue replay flag, отсутствие horizontal overflow и наличие queue status slots.
- `curl -I --max-time 10 http://temichev-posthub.ru` — вернул `308 Permanent Redirect` от Caddy на `https://temichev-posthub.ru/`.
- `curl -I --max-time 15 https://temichev-posthub.ru` — пока падает с TLS internal error; это зафиксировано как deployment limitation.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.
- `make validate-spec` — пройден: `checks=69 files=499 errors=0`.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend product API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. Refresh recovery только перезагружает страницу и сохраняет локальный job; replay не выполняется.
2. Automatic replay/background sync по-прежнему выключены.
3. Safe manual replay execution и merge UI для `version_conflict` не реализованы.
4. Production split-domain cookie/CSRF strategy остаётся отдельным решением.
5. `temichev-posthub.ru` уже отвечает на HTTP через Caddy redirect, но HTTPS/certificate setup ещё не готов.

## Следующий рекомендуемый slice

UI Phase 10ba: safe manual replay execution preflight для guided queue или deployment-readiness slice для `temichev-posthub.ru` после подтверждения доступа к серверу/проекту.
