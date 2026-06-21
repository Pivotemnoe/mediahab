# UI Phase 10t — отчёт

## Что сделано

- Guided-form queue browser contract вынесен из `guided-form-actions.tsx` в отдельный модуль `apps/web/src/services/guided-queue-contract.ts`.
- Новый модуль содержит:
  - `guidedFormQueuePrefix`;
  - `guidedFormQueueEvent`;
  - `isGuidedFormQueueKey`;
  - `guidedFieldQueueKey`.
- `OfflineStatus` больше не импортирует тяжёлый Content Studio client component ради двух констант.
- Guided-form actions используют общий helper для построения queue key.
- Поведение local queue и app-shell queue banner не менялось.

## Противоречия и открытые вопросы

1. Public `sw.js` пока статический и не импортирует frontend source modules. Для настоящего service worker replay нужен отдельный build/contract strategy.
2. Queue payload shape пока остаётся локальным для guided-form component; его стоит формализовать перед background sync.
3. Live API-mode smoke для autosave/conflict/retry path всё ещё не выполнен.

## Созданные и изменённые файлы

- Создан: `apps/web/src/services/guided-queue-contract.ts`
- Создан: `docs/exec-plans/UI_PHASE_10T_GUIDED_QUEUE_CONTRACT.md`
- Создан: `docs/exec-plans/UI_PHASE_10T_REPORT_RU.md`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`
- Изменён: `apps/web/src/components/pwa/offline-status.tsx`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил, что без local queue shell banner не показывается, при seeded localStorage queue shell показывает `Есть несинхронизированные поля: 2.`, queued field text не попадает в UI, кнопки fixture mode остаются disabled и horizontal overflow отсутствует.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10t-content-390.png` и `/private/tmp/mediahub-ui10t-content-1440.png`.
- `make validate-spec` — пройден: `checks=68 files=416 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10u: формализовать queue payload DTO и подготовить service-worker/background sync replay, либо live API-mode smoke для guided-form autosave/conflict/retry.
