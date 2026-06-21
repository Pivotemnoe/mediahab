# UI Phase 10ag — отчёт

## Что сделано

- Guided-form mutation payload builder теперь сохраняет primitive JSON для schema-known primitive fields.
- `fieldType=boolean` отправляется как JSON boolean:
  - checked checkbox: `true`;
  - unchecked checkbox / отсутствующее `value`: `false`.
- `fieldType=number` и `fieldType=rating` отправляются как JSON number при строгом числовом вводе.
- Числа с запятой нормализуются в JSON number, например `12,5` → `12.5`.
- Неоднозначный числовой текст остаётся fallback `{ text }`, например `7 из 9`.
- Денежные поля из UI Phase 10af продолжают отправляться как `{ amount, currency: "RUB" }`.
- Numeric/money/rating inputs получили `inputMode="decimal"` для мобильной клавиатуры без изменения видимого UI.
- Payload contract harness покрывает boolean, unchecked boolean, number, rating, ambiguous rating fallback и repeatable rating.

## Противоречия и открытые вопросы

1. Rating scale validation пока не enforced во frontend. Это должно опираться на schema/backend правила, а не на локальную догадку.
2. Select/multi-select/media typed DTO остаются будущими slices.
3. Полноценный ratings object editor для generated/user ratings не входит в этот срез.
4. Live STT/upload, publication flow и merge UI для конфликтов версий остаются открытыми частями полного ТЗ.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10AG_GUIDED_ACTION_PRIMITIVE_VALUES.md`
- Создан: `docs/exec-plans/UI_PHASE_10AG_REPORT_RU.md`
- Изменён: `apps/web/src/services/guided-action-payloads.ts`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`
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
- Smoke проверил наличие `main`, guided form, текста `группа полей`, `Добавить позицию`, `Статус действия появится здесь.`, disabled-кнопок `Сохранить`, `Сохранить и зафиксировать`, `Добавить`, `Добавить и зафиксировать`, отсутствие horizontal overflow, service-worker flags и наличие decimal input hints.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10ag-content-390.png` и `/private/tmp/mediahub-ui10ag-content-1440.png`.
- `make validate-spec` — пройден: `checks=69 files=453 errors=0`.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API, OpenAPI и typed frontend client не менялись.

## Следующий рекомендуемый slice

Продолжить guided-form mutation UX: либо typed DTO для select/media, либо более явный recovery UX для version conflict/local queue.
