# UI Phase 10q — отчёт

## Что сделано

- Для одиночных guided-form field forms добавлен первый debounced autosave.
- Автосохранение работает только когда поле реально mutable (`canSubmit=true`), то есть в API mode и без fact-lock.
- Autosave использует существующий `saveGuidedFieldAction` и hidden submit с `intent=save`; `lock` никогда не вызывается автоматически.
- Добавлен русский статус автосохранения:
  - `Автосохранение включится в API-режиме для изменяемых полей.`;
  - `Автосохранение ждёт ввода.`;
  - `Автосохранение запланировано.`;
  - `Автосохраняем через backend...`;
  - `Автосохранено через backend.`;
  - `Автосохранение не прошло. Локальный черновик сохранён в браузере.`
- Local draft recovery из UI Phase 10p сохранён как fallback.
- Repeatable group creation остаётся ручной: новая позиция не создаётся автоматически при наборе текста.

## Противоречия и открытые вопросы

1. Это не durable offline queue: если backend недоступен, пользовательский текст остаётся только в browser-local draft.
2. Нет merge UI для конфликтов версий; существующий refresh/recovery UX остаётся основным сценарием.
3. Live autosave acceptance требует backend API mode, authenticated session и реальный content item.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10Q_GUIDED_FORM_DEBOUNCED_AUTOSAVE.md`
- Создан: `docs/exec-plans/UI_PHASE_10Q_REPORT_RU.md`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил наличие `main`, guided form, текста `Статус действия появится здесь.`, статуса local draft, disabled autosave status в fixture mode, disabled-кнопок `Сохранить` и `Добавить`, текста `Сохранение доступно в API-режиме`, отсутствие localStorage записей в fixture mode и отсутствие horizontal overflow.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10q-content-390.png` и `/private/tmp/mediahub-ui10q-content-1440.png`.
- `make validate-spec` — пройден: `checks=68 files=409 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10r: полноценная guided-form offline queue с pending/failed jobs и ручным retry, либо live API-mode smoke для autosave/conflict path.
