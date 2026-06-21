# UI Phase 10af — отчёт

## Что сделано

- Guided-form mutation payload builder теперь умеет собирать typed JSON для денежных полей.
- Для `fieldType=money` непустое распознанное значение отправляется как `{ amount, currency: "RUB" }`.
- Пустое или нераспознанное money-значение остаётся текстовым fallback `{ text }`, чтобы не терять пользовательский ввод.
- Single-field save теперь отправляет скрытый `fieldType`.
- Repeatable group add теперь отправляет скрытый `fieldType:<fieldKey>` для каждого нового дочернего поля.
- View model repeatable-группы теперь передаёт raw `type` рядом с русским `typeLabel`.
- Payload contract harness покрывает:
  - прежнее текстовое сохранение;
  - typed money save;
  - текстовый fallback для нераспознанного money input;
  - typed money value для repeatable `price`.

## Противоречия и открытые вопросы

1. Валюта пока консервативно фиксируется как `RUB`, потому что проектная валюта ещё не передаётся в guided-form action contract.
2. Type-aware mapping для `number`, `rating`, boolean, select и media остаётся отдельным будущим срезом после фиксации DTO-ожиданий backend.
3. Полноценный inline merge workflow для `version_conflict`, live STT/upload и publication flow не входят в этот срез.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AF_GUIDED_ACTION_VALUE_MAPPING.md`
- Создан: `docs/exec-plans/UI_PHASE_10AF_REPORT_RU.md`
- Изменён: `apps/web/src/services/content.ts`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`
- Изменён: `apps/web/src/services/guided-action-payloads.ts`
- Изменён: `tools/check_guided_action_payloads.mjs`

## Результаты тестов и проверок

- `node tools/check_guided_action_payloads.mjs` — пройден.
- `make test-ui-hardening` — пройден.
- `make typecheck` — пройден.
- `make test` — пройден.
- `make lint` — пройден.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через in-app browser — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил наличие `main`, guided form, текста `группа полей`, `Добавить позицию`, `Статус действия появится здесь.`, disabled-кнопок `Сохранить`, `Сохранить и зафиксировать`, `Добавить`, `Добавить и зафиксировать`, отсутствие horizontal overflow и service-worker flags.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10af-content-390.png` и `/private/tmp/mediahub-ui10af-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=451 errors=0`.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Следующий рекомендуемый slice

Продолжить guided-form mutation UX: расширить typed value mapping для следующих полевых типов или перейти к более явному inline recovery для конфликтов версий и очереди.
