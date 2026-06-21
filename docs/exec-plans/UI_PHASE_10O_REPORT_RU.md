# UI Phase 10o — отчёт

## Что сделано

- Guided-form action state расширен typed-полем `recoveryAction`.
- Server actions теперь классифицируют восстановление:
  - `version_conflict`, `csrf_required`, `csrf_invalid` → `refresh`;
  - API unavailable и generic backend rejection → `retry`;
  - успешные действия → `none`.
- Inline status в guided-form actions получил явный recovery UX:
  - кнопка `Обновить страницу` для stale version/CSRF состояния;
  - подсказка `Повторить сохранение` через существующие submit-кнопки для retry-сценариев.
- Fixture mode по-прежнему держит mutation-кнопки disabled и показывает зарезервированный статусный блок.

## Противоречия и открытые вопросы

1. Это recovery prompt, а не полноценный merge workflow: локальные несохранённые изменения после refresh пока не сохраняются.
2. Debounced autosave и offline queue остаются следующими отдельными slices.
3. Split-domain deployment всё ещё требует отдельного решения по cookie/domain strategy для Next server actions и backend CSRF.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10O_GUIDED_FORM_RECOVERY_UI.md`
- Создан: `docs/exec-plans/UI_PHASE_10O_REPORT_RU.md`
- Изменён: `apps/web/src/services/guided-action-state.ts`
- Изменён: `apps/web/src/services/content-actions.ts`
- Изменён: `apps/web/src/components/phase04/guided-form-actions.tsx`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил наличие `main`, guided form, текста `Статус действия появится здесь.`, disabled-кнопок `Сохранить` и `Добавить` в fixture mode, текста `Сохранение доступно в API-режиме`, отсутствие recovery-кнопки в idle fixture state и отсутствие horizontal overflow.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10o-content-390.png` и `/private/tmp/mediahub-ui10o-content-1440.png`.
- `make validate-spec` — пройден: `checks=68 files=405 errors=0`.
- `git diff --check` — пройден.
- `apps/web/next-env.d.ts` после Next build/dev возвращён к проектному checked-in виду.

## Миграции и API

- Миграции не требуются.
- Backend API и OpenAPI не менялись.
- Typed frontend API client не регенерировался.

## Следующий рекомендуемый slice

UI Phase 10p: debounced autosave/offline queue для guided form или сохранение локального draft перед refresh при `version_conflict`.
