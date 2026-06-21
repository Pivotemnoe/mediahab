# UI Phase 10m — отчёт

## Что сделано

- Добавлен CSRF-aware mutation helper `apiRequest` в `apps/web/src/services/runtime.ts`.
- Добавлены server actions `saveGuidedFieldAction` и `addRepeatableGroupAction` для Content Studio.
- Guided form view model расширена данными для мутаций: `canMutate`, `itemVersion`, `blockId`, исходные ключи полей и metadata для добавления repeatable group.
- `ContentStudioShell` теперь рендерит формы сохранения для factual fields:
  - top-level поля идут через `PUT /api/v1/content-items/{content_id}/blocks/{field_key}`;
  - существующие blocks идут через `PATCH /api/v1/content-blocks/{block_id}`;
  - новая позиция repeatable group идёт через `POST /api/v1/content-items/{content_id}/repeatable-groups/{group_key}`.
- В fixture mode кнопки сохранения и фиксации остаются disabled; API mode включает их только при наличии guided form и версии материала.
- Исправлена документация UI Phase 10l: generated OpenAPI уже содержит `/api/v1/content-items/{content_id}/guided-form`.

## Противоречия и открытые вопросы

1. Полноценный autosave с debounce, offline queue и восстановлением после конфликта ещё не реализован.
2. `409 version_conflict` пока обрабатывается backend и server action exception, но inline conflict UI ещё не добавлен.
3. Для split-domain deployment нужно подтвердить cookie/domain стратегию, чтобы Next server actions могли читать session/CSRF cookies.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10M_GUIDED_FORM_MUTATION_BOUNDARY.md`
- Создан: `docs/exec-plans/UI_PHASE_10M_REPORT_RU.md`
- Создан: `apps/web/src/services/content-actions.ts`
- Изменён: `apps/web/src/services/runtime.ts`
- Изменён: `apps/web/src/services/content.ts`
- Изменён: `apps/web/src/components/phase04/content-studio-shell.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`
- Изменён: `docs/exec-plans/UI_PHASE_10L_GUIDED_FORM_RENDERER.md`
- Изменён: `docs/exec-plans/UI_PHASE_10L_REPORT_RU.md`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `git diff --check` — пройден до build/smoke.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 app route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/content/demo-review`, 390px;
  - `/app/content/demo-review`, 1440px.
- Smoke проверил наличие mutation forms, disabled-кнопок `Сохранить`, `Сохранить и зафиксировать`, `Добавить`, `Добавить и зафиксировать` в fixture mode, текст `Сохранение доступно в API-режиме`, `Версия: fixture`, русскую guided form и отсутствие horizontal overflow.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10m-content-390.png` и `/private/tmp/mediahub-ui10m-content-1440.png`.
- Временный CDP-порт `9236` после проверки закрыт.
- `make validate-spec` — пройден: `checks=68 files=399 errors=0`.

## Решения, требующие подтверждения

1. Следующий slice: inline conflict UI для `409 version_conflict` или debounced autosave/offline queue.
2. Подтвердить deployment cookie strategy, если frontend и API будут жить на разных поддоменах.
