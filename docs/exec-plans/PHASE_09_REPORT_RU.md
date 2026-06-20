# Отчёт Phase 09 — Instagram connector

## Что сделано

Phase 09 переводит Instagram из подготовленного варианта в технический коннектор `instagram_media`, но live-публикацию не объявляет готовой.

Добавлен Instagram media contract: caption ограничен 2 200 символами, hashtags ограничены 30, mentions ограничены 20, carousel работает как 2-10 media items, а single image/video/Reel представлены как отдельные режимы.

Публикация Instagram сейчас возвращает `manual_required` с готовым media package, readiness diagnostics, quota-check step и Meta container-plan: create container, poll status, publish container. Это честный MVP-контур без сетевого вызова к Meta, пока нет professional account, Meta app, OAuth, scopes, app review, quota access и safe test account.

Секреты Meta (`access_token`, `meta_access_token`, `instagram_access_token`, `app_secret`, `client_secret`, `meta_app_secret`) редактируются в destination responses, attempts и evidence.

## Найденные противоречия и открытые вопросы

1. Каноническое ТЗ требует Instagram publication через official API, но live readiness полностью зависит от внешних Meta условий. Поэтому в Phase 09 live остаётся feature-flagged, а production-ready статус не заявляется.
2. Official Meta docs во время реализации не удалось открыть через browsing: endpoint вернул 429. Для этой фазы использован локальный canonical policy, но перед live enablement нужно повторно проверить текущую версию Meta docs.
3. Детальная media validation по codec/duration/aspect ratio оставлена как live-readiness задача, потому что текущая реализация пока моделирует контракт и manual package.
4. OAuth/token lifecycle и encrypted secret vault пока не реализуют полный Meta flow; это внешний prerequisite для live.

## Созданные файлы

- `docs/exec-plans/PHASE_09_INSTAGRAM_CONNECTOR.md`
- `docs/exec-plans/PHASE_09_REPORT_RU.md`
- `services/api/tests/test_instagram_connector.py`

## Изменённые файлы

- `apps/web/src/components/phase06/publication-core-shell.tsx`
- `docs/OPEN_QUESTIONS.md`
- `services/api/app/modules/publications/connectors.py`

## Результаты тестов и проверок

- `.venv/bin/python -m compileall -q services/api/app services/api/tests` — прошёл.
- `.venv/bin/python -m unittest services.api.tests.test_instagram_connector -v` — прошёл: 3 теста.
- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v` — прошёл: 6 тестов.
- `.venv/bin/python -m unittest services.api.tests.test_telegram_connector -v` — прошёл: 3 теста.
- `.venv/bin/python -m unittest services.api.tests.test_max_connector -v` — прошёл: 4 теста.
- `make openapi` — прошёл, публичные OpenAPI артефакты не изменились.
- `make typecheck` — прошёл.
- `make lint` — прошёл.
- `make test-e2e` — прошёл.
- `make test` — прошёл: 5 общих тестов и 38 API-тестов.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — прошёл: 32 route.
- `make validate-spec` — прошёл: `checks=68 files=323 errors=0`.
- `git diff --check` — прошёл.

## Решения, которые требуют подтверждения

1. Передать Instagram professional account и safe test account.
2. Подтвердить Meta app ownership, OAuth redirect domain, scopes и app-review status.
3. Подтвердить, когда Instagram live publication можно включать, или оставить `manual_required` до отдельного live spike.
4. Перед live enablement повторно проверить official Meta docs/API version.
5. Подтвердить production secret storage для Meta tokens/app secrets.
