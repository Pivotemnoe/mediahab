# UI Phase 10aj — отчёт

## Что сделано

- Typed guided action value mapper вынесен в общий сервис `guided-action-values`.
- `guided-action-payloads` теперь использует общий mapper без изменения формы API payload.
- `guided-queue-replay` получил pure helper `buildGuidedQueueReplayDraft`, который строит typed draft из локального queue job.
- Replay draft сохраняет исходные ключи queue job:
  - `value` для single-field формы;
  - `field:<key>` для будущих repeatable group queue jobs.
- Для legacy jobs без `fieldTypes` draft возвращает text fallback и список `missingFieldTypes`.
- Readiness contract не изменился: `canAutoReplay` остаётся `false`, автоматический replay не включён.
- Hardening harness обновлён так, чтобы проверять shared service imports без Next bundler.

## Противоречия и открытые вопросы

1. Автоматический background replay по-прежнему выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
2. Текущий local queue shape хранит одно строковое значение на ключ; для lossless multi-select replay нужен отдельный array-capable queue value slice.
3. Replay draft пока не строит сетевой request envelope и не делает mutation.
4. Merge UI для `version_conflict`, live STT/upload и publication flow остаются открытыми частями полного ТЗ.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AJ_GUIDED_QUEUE_REPLAY_DRAFT.md`
- Создан: `docs/exec-plans/UI_PHASE_10AJ_REPORT_RU.md`
- Создан: `apps/web/src/services/guided-action-values.ts`
- Изменён: `apps/web/src/services/guided-action-payloads.ts`
- Изменён: `apps/web/src/services/guided-queue-replay.ts`
- Изменён: `tools/check_guided_action_payloads.mjs`
- Изменён: `tools/check_guided_queue_replay.mjs`

## Результаты тестов и проверок

- `node tools/check_guided_action_payloads.mjs` — пройден.
- `node tools/check_guided_queue_replay.mjs` — пройден.
- `make test-ui-hardening` — пройден.
- `make typecheck` — пройден.
- `make lint` — пройден.
- `make test` — пройден: `Ran 42 tests ... OK`.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через in-app browser — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил наличие `main`, guided form text, `группа полей`, `Добавить позицию`, `Статус действия появится здесь.`, disabled-кнопки `Сохранить`, `Сохранить и зафиксировать`, `Добавить`, `Добавить и зафиксировать`, отсутствие horizontal overflow и PWA flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10aj-content-390.png` и `/private/tmp/mediahub-ui10aj-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=461 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Следующий рекомендуемый slice

Продолжить guided-form recovery path: array-capable queue values для lossless multi-select replay или request-envelope preparation для ручного replay без включения background sync.
