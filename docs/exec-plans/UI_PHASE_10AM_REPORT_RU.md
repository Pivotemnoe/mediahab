# UI Phase 10am — отчёт

## Что сделано

- Queue UI в guided single-field форме теперь показывает готовность локальной очереди к ручному повтору.
- Для complete request draft показывается русское сообщение: запрос собран локально, автоматическая отправка выключена.
- Для legacy/incomplete jobs показывается русское сообщение со списком недостающих частей:
  - данные формы;
  - действие сохранения;
  - значение поля.
- UI использует `buildGuidedQueueReplayRequestDraft`, но не отправляет запрос и не включает automatic replay.
- Fixture mode остаётся disabled; readiness text появляется только при наличии queue job.

## Противоречия и открытые вопросы

1. Автоматический background replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
2. Request-envelope draft всё ещё не исполняется и не отправляется в backend.
3. Repeatable group creation пока не подключена к durable queue UI.
4. Merge UI для `version_conflict`, live STT/upload и publication flow остаются открытыми частями полного ТЗ.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AM_GUIDED_QUEUE_MANUAL_REPLAY_UI.md`
- Создан: `docs/exec-plans/UI_PHASE_10AM_REPORT_RU.md`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- Visual smoke `/app/content/demo-review` — пройден на 390px и 1440px через isolated Playwright/Chrome context с `serviceWorkers: "block"`.
  Проверены `main`, guided-form text, slots под action/autosave/queue status, disabled mutation buttons, отсутствие horizontal overflow и PWA flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Скриншоты сохранены:
  - `/private/tmp/mediahub-ui10am-content-390.png`;
  - `/private/tmp/mediahub-ui10am-content-1440.png`.
- `next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: checks=69, files=467, errors=0.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Следующий рекомендуемый slice

Продолжить guided-form recovery path: durable queue UI для repeatable group creation или безопасный ручной replay execution flow после подтверждения cookie/CSRF strategy.
