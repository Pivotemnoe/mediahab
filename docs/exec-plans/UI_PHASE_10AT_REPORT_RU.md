# UI Phase 10at — отчёт

## Что сделано

- Расширен authenticated API-mode smoke для guided form.
- Repeatable group creation теперь проверяется в двух ветках:
  - stale `version` возвращает `409` и код `version_conflict`;
  - после этого current version успешно создаёт repeatable group blocks.
- Runtime UI, backend routes, OpenAPI, миграции, replay policy и server actions не менялись.
- Automatic replay и safe manual replay execution не включались.

## Зачем это нужно

Repeatable queue UI уже умеет сохранять failure state локально. Этот slice закрепляет API-mode evidence, что repeatable creation использует тот же optimistic version guard, что и обычные guided-form мутации. Это важно для дальнейшего conflict/retry UX: очередь не должна считать stale repeatable add безопасным для автоматического повтора.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AT_REPEATABLE_QUEUE_FAILURE_API_SMOKE.md`
- Создан: `docs/exec-plans/UI_PHASE_10AT_REPORT_RU.md`
- Изменён: `tools/check_guided_form_api_mode.py`

## Результаты focused checks

- `.venv/bin/python tools/check_guided_form_api_mode.py` — пройден.
- `make test-ui-hardening` — пройден.
- `make typecheck` — пройден.

Focused evidence:

- `POST /content-items/{id}/repeatable-groups/dishes` со stale version вернул `409 Conflict`.
- Error code: `version_conflict`.
- Повторный POST с актуальной версией вернул `200 OK`.

## Полный gate

- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- Visual smoke `/app/content/demo-review` — пройден на 390px и 1440px через isolated Playwright/Chrome context с `serviceWorkers: "block"`.
  Проверены русские guided-form тексты, disabled mutation buttons, отсутствие horizontal overflow, отсутствие queue diagnostic на empty fixture queue и PWA dataset flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Скриншоты сохранены:
  - `/private/tmp/mediahub-ui10at-content-390.png`;
  - `/private/tmp/mediahub-ui10at-content-1440.png`.
- `next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: checks=69, files=485, errors=0.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Открытые ограничения

1. Automatic replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
2. Safe manual replay execution flow требует отдельного среза и подтверждения cookie/CSRF strategy.
3. Merge UI для `version_conflict`, live STT/upload и production launch hardening остаются вне этого slice.

## Следующий рекомендуемый slice

UI Phase 10au: source-level или browser-level harness для того, что repeatable `version_conflict` сохраняется в локальную очередь как blocked/refresh job без раскрытия payload values, либо следующий safe conflict recovery UI.
