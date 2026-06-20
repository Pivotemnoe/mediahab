# Отчёт Phase 10 — scheduling, calendar, hardening slice

## Что сделано

Phase 10 выполнена как проверяемый technical slice, а не как ложное закрытие всего production hardening.

Добавлена нормализация расписания: если API получает naive `scheduled_at`, время трактуется как локальное время рабочего пространства и сохраняется в UTC. Для текущего дефолта `Europe/Moscow` значение `2026-06-21T12:00:00` сохраняется как `2026-06-21T09:00:00+00:00`.

Добавлен `POST /api/v1/publications/{publication_id}/reschedule`: перенос обновляет `publications.scheduled_at` и pending `outbox_events.available_at`. Отмена scheduled публикации закрывает pending publish event без публикации.

Добавлен worker-restart/idempotency тест: если после успешной публикации появляется повторный pending outbox event, повторная обработка не создаёт второй `external_post`.

Добавлен минимальный PWA runtime: production service worker, app-shell cache для `/app`, online/offline state на `documentElement`. Полная offline draft queue/reconciliation остаётся отдельной production/PWA задачей.

Обновлён технический экран `/app/calendar` под Phase 10 и добавлен runbook `docs/runbooks/phase10-hardening-ru.md`.

## Найденные противоречия и открытые вопросы

1. Phase 10 по ТЗ включает RLS, backups, restore drill, monitoring и PWA offline queue. Локальная SQLite-среда не может доказать PostgreSQL RLS и staging restore drill, поэтому они оформлены как production-зависимости, а не как закрытые acceptance items.
2. Workspace timezone уже был в модели, но schedule API до этой фазы не нормализовал naive local time явно.
3. Полная offline draft queue должна решить, храним ли только текстовые черновики или также audio/media metadata в первом pilot.

## Созданные файлы

- `apps/web/public/sw.js`
- `apps/web/src/components/pwa/pwa-runtime.tsx`
- `docs/exec-plans/PHASE_10_SCHEDULING_HARDENING.md`
- `docs/exec-plans/PHASE_10_REPORT_RU.md`
- `docs/runbooks/phase10-hardening-ru.md`

## Изменённые файлы

- `apps/web/src/app/app/calendar/page.tsx`
- `apps/web/src/app/layout.tsx`
- `docs/OPEN_QUESTIONS.md`
- `services/api/app/api/v1/routes/publications.py`
- `services/api/app/modules/publications/service.py`
- `services/api/tests/test_publication_core.py`
- `tools/e2e_smoke.py`

## Результаты тестов и проверок

- `.venv/bin/python -m compileall -q services/api/app services/api/tests` — прошёл.
- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v` — прошёл: 8 тестов.
- `make openapi` — прошёл, OpenAPI artefacts обновлены.
- `make typecheck` — прошёл.
- `make lint` — прошёл.
- `make test-e2e` — прошёл.
- `make test` — прошёл: 5 общих тестов и 40 API-тестов.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — прошёл, собрано 32 routes.
- `make validate-spec` — прошёл: checks=68, files=328, errors=0.
- `git diff --check` — прошёл без замечаний.

## Решения, которые требуют подтверждения

1. Подтвердить production PostgreSQL RLS policy set и среду, где прогонять RLS acceptance.
2. Подтвердить backup destination, encryption, RPO/RTO и staging restore-drill процедуру.
3. Решить, включает ли первый PWA offline pilot только текстовые drafts или ещё audio/media metadata.
4. Подтвердить monitoring/alerting provider и формат operational evidence.
