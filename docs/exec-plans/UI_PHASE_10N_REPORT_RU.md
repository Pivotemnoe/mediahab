# UI Phase 10n — отчёт

## Что сделано

- Guided-form server actions теперь возвращают typed action state вместо user-visible raw exception.
- `apiRequest` читает канонический backend error envelope `{ error: { code, message, details, request_id } }` и сохраняет `code`, `details`, `requestId`.
- Добавлен общий frontend state-модуль для статуса guided-form actions.
- Добавлен scoped client boundary `guided-form-actions.tsx` только для mutation forms:
  - сохранение поля;
  - сохранение и fact-lock;
  - добавление repeatable group;
  - добавление repeatable group с fact-lock.
- В форме появился inline `aria-live` статус на русском языке.
- Добавлены русские сообщения для:
  - `csrf_required`;
  - `csrf_invalid`;
  - `version_conflict`;
  - API unavailable / connection failure;
  - generic backend rejection.
- Fixture mode по-прежнему держит mutation-кнопки disabled, но теперь показывает зарезервированное место под статус действия.

## Противоречия и открытые вопросы

1. Полноценный merge/reload workflow для `409 version_conflict` ещё не реализован: UI только объясняет, что материал изменился и страницу нужно обновить.
2. Debounced autosave и offline queue остаются следующими отдельными slices.
3. Split-domain deployment всё ещё требует подтверждения cookie/domain стратегии для Next server actions и backend CSRF.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10N_GUIDED_FORM_ERROR_UI.md`
- Создан: `docs/exec-plans/UI_PHASE_10N_REPORT_RU.md`
- Создан: `apps/web/src/components/phase04/guided-form-actions.tsx`
- Создан: `apps/web/src/services/guided-action-state.ts`
- Изменён: `apps/web/src/services/runtime.ts`
- Изменён: `apps/web/src/services/content-actions.ts`
- Изменён: `apps/web/src/components/phase04/content-studio-shell.tsx`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил наличие `main`, guided form, текста `Статус действия появится здесь.`, disabled-кнопок `Сохранить` и `Добавить` в fixture mode, текста `Сохранение доступно в API-режиме` и отсутствие horizontal overflow.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10n-content-390.png` и `/private/tmp/mediahub-ui10n-content-1440.png`.
- `make validate-spec` — пройден: `checks=68 files=403 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10o: debounced autosave/offline queue для guided form или первый explicit reload/conflict recovery flow для `version_conflict`.
