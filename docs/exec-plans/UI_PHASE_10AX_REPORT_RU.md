# UI Phase 10ax — отчёт

## Что сделано

- Добавлен `tools/api_smoke_server.py`: локальный FastAPI smoke server, который поднимает API на временной SQLite базе через текущие backend routes и schema.
- Добавлен `tools/check_guided_queue_api_seeded_smoke.mjs`: воспроизводимый API-mode browser smoke.
- Smoke делает полный локальный путь:
  - запускает временный FastAPI server с `SESSION_COOKIE_SECURE=false`;
  - регистрирует локального пользователя через HTTP;
  - импортирует preset `chto-poest-armavir` как database-importable preset;
  - создаёт реальный content item;
  - запускает Next в `NEXT_PUBLIC_DATA_MODE=api`;
  - ставит browser cookies в headless Chrome;
  - seed-ит `localStorage` ключ `tmh:guided-form-queue:v1:repeatable:<contentId>:dishes:new`;
  - открывает real API-mode Content Studio page и проверяет blocked repeatable queue refresh surface.
- Пользовательский UI, backend product routes, OpenAPI, миграции и runtime replay policy не менялись.
- Скриншоты smoke сохраняются только локально в `/private/tmp`, не в репозиторий.

## Что проверяет новый smoke

- На API-mode странице есть `data-guided-queue-status="blocked"`.
- Queue job имеет `data-guided-queue-kind="repeatable_group"` и `data-guided-queue-recovery="refresh"`.
- `guided-queue-refresh` виден.
- `guided-queue-retry` отсутствует для refresh-required job.
- `guided-queue-clear` виден.
- Русская blocked-copy для добавления позиции отображается.
- Горизонтального overflow нет на 390px и 1440px.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AX_API_SEEDED_BLOCKED_QUEUE_SMOKE.md`
- Создан: `docs/exec-plans/UI_PHASE_10AX_REPORT_RU.md`
- Создан: `tools/api_smoke_server.py`
- Создан: `tools/check_guided_queue_api_seeded_smoke.mjs`
- Обновлены validation artifacts: `SPEC_MANIFEST.json`, `reference/VALIDATION_REPORT.md`

## Результаты focused checks

- `node tools/check_guided_queue_api_seeded_smoke.mjs` — пройден:
  - `/private/tmp/mediahub-ui10ax-api-seeded-390.png`;
  - `/private/tmp/mediahub-ui10ax-api-seeded-1440.png`.
- `make typecheck` — пройден.
- `make test-ui-hardening` — пройден.

## Проверки

- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- API-mode seeded smoke — пройден на 390px и 1440px:
  - `/private/tmp/mediahub-ui10ax-api-seeded-390.png`;
  - `/private/tmp/mediahub-ui10ax-api-seeded-1440.png`.
- Fixture visual smoke `/app/content/demo-review` — пройден через headless Chrome CDP:
  - `/private/tmp/mediahub-ui10ax-content-390.png`;
  - `/private/tmp/mediahub-ui10ax-content-1440.png`.
- Fixture visual smoke подтвердил `main`, guided field group, repeatable-group slot, action/autosave/queue status slots, disabled mutation buttons, service-worker flags, отсутствие horizontal overflow на 390px и 1440px, а также наличие queue DOM hooks.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: `checks=69 files=495 errors=0`.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend product API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. Smoke валидирует local same-host API-mode flow; production split-domain cookie/CSRF strategy остаётся отдельным решением.
2. Automatic replay по-прежнему выключен.
3. Safe manual replay execution и merge UI для `version_conflict` не реализованы.
4. Live STT/upload и production launch hardening остаются вне этого slice.

## Следующий рекомендуемый slice

UI Phase 10ay: использовать API-mode seeded smoke как базу для safe manual replay execution design, либо добавить проверку clear/refresh recovery после seeded blocked queue без выполнения backend replay.
