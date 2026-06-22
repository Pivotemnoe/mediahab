# UI Phase 10aq — отчёт

## Что сделано

- Shell-level guided queue readiness copy больше не называет все queued jobs `полями`.
- Для mixed queue с field saves, repeatable group additions и legacy jobs используется нейтральное русское сообщение:
  - `Есть несинхронизированные изменения: N.`
  - `Нет сети: N изменение/изменения/изменений в локальной очереди...`
- `GuidedQueueReplayReadiness` теперь дополнительно возвращает:
  - `fieldJobCount`;
  - `repeatableGroupJobCount`;
  - `unknownJobCount`.
- Harness `tools/check_guided_queue_replay.mjs` расширен проверками:
  - field-only queue;
  - mixed queue;
  - legacy/unknown queue jobs;
  - русские plural forms для 1, 2, 5, 11 изменений.
- Runtime replay policy не менялась: `canAutoReplay=false`.

## Противоречия и открытые вопросы

1. Shell copy теперь корректна для mixed queue, но automatic replay всё ещё выключен из-за HttpOnly cookie, CSRF и version-conflict constraints.
2. Safe manual replay execution flow требует отдельного среза и подтверждения cookie/CSRF strategy.
3. Merge UI для `version_conflict`, live STT/upload и publication flow остаются открытыми частями полного ТЗ.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AQ_GUIDED_QUEUE_MIXED_COPY.md`
- Создан: `docs/exec-plans/UI_PHASE_10AQ_REPORT_RU.md`
- Изменён: `apps/web/src/services/guided-queue-replay.ts`
- Изменён: `tools/check_guided_queue_replay.mjs`

## Результаты тестов и проверок

- `node tools/check_guided_queue_replay.mjs` — пройден.
- `make typecheck` — пройден.
- `make test-ui-hardening` — пройден.
- `make test` — пройден: 5 общих тестов и 42 API-теста.
- `make lint` — пройден.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройден, собрано 32 routes.
- Visual smoke `/app/content/demo-review` — пройден на 390px и 1440px через isolated Playwright/Chrome context с `serviceWorkers: "block"`.
  Проверены `main`, guided-form text, repeatable queue status slots, disabled mutation buttons, отсутствие horizontal overflow и PWA flags:
  - `serviceWorkerCapabilities=loaded`;
  - `serviceWorkerMutationReplay=manual`;
  - `serviceWorkerBackgroundSync=disabled`;
  - `guidedQueueReplay=manual_retry_required`.
- Дополнительный seeded smoke с mixed local queue подтвердил shell banner `Есть несинхронизированные изменения: 2.` и отсутствие старой copy `Есть несинхронизированные поля: 2.`
- Скриншоты сохранены:
  - `/private/tmp/mediahub-ui10aq-content-390.png`;
  - `/private/tmp/mediahub-ui10aq-content-1440.png`;
  - `/private/tmp/mediahub-ui10aq-content-seeded-390.png`.
- `next-env.d.ts` после Next build/dev возвращён к проектному виду.
- `make validate-spec` — пройден: checks=69, files=476, errors=0.
- `git diff --check` — пройден.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Следующий рекомендуемый slice

UI Phase 10ar: API-mode browser/harness для repeatable queue failure path или safe manual replay execution flow после подтверждения cookie/CSRF strategy.
