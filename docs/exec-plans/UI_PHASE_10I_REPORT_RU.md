# UI Phase 10i — отчёт

## Что сделано

- Расширен `apps/web/src/services/content.ts`: Content Studio internals и mobile capture теперь получают view model через service boundary.
- `ContentStudioShell` больше не импортирует `content-studio-fixtures` и `mobile-capture-fixtures` напрямую.
- `/app/content/new` стал server component и получает данные через `getNewContentViewModel()`.
- В API-режиме `ContentStudioViewModel` читает:
  - `/api/v1/content-items/{contentId}/blocks`;
  - `/api/v1/content-items/{contentId}/variants`.
- Добавлены frontend DTO для `BlockOut`, `BlocksResponse`, `PlatformVariantOut`, `PlatformVariantsResponse`.
- Панели без read endpoint оставлены как явный fallback: AI-предложения, revision history, live capture состояние.

## Противоречия и открытые вопросы

1. В backend есть `content_revisions`, но нет read endpoint списка revisions для UI history. Нужен отдельный backend-slice.
2. Live recording/STT и автосохранение блоков пока не подключены к frontend-мутациям. Для production нужен отдельный slice с CSRF, конфликтами версий и offline queue.
3. API block mapping сейчас технический: field labels нормализуются консервативно. Финальный guided form renderer нужно делать отдельно от этого service-boundary slice.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_10I_CONTENT_STUDIO_INTERNAL_SERVICES.md`
- Создан: `docs/exec-plans/UI_PHASE_10I_REPORT_RU.md`
- Изменён: `apps/web/src/services/content.ts`
- Изменён: `apps/web/src/services/openapi-types.ts`
- Изменён: `apps/web/src/components/phase04/content-studio-shell.tsx`
- Изменён: `apps/web/src/app/app/content/new/page.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройден.
- `make lint` — пройден.
- `pnpm --filter @temichev/web build` — пройден, Next.js собрал 32 route.
- Visual smoke через headless Chrome CDP — пройден:
  - `/app/content/demo-review`, 390px: `/private/tmp/mediahub-ui10i-content-studio-390.png`
  - `/app/content/demo-review`, 1440px: `/private/tmp/mediahub-ui10i-content-studio-1440.png`
  - `/app/content/new`, 390px: `/private/tmp/mediahub-ui10i-new-content-390.png`
  - `/app/content/new`, 1440px: `/private/tmp/mediahub-ui10i-new-content-1440.png`
- Smoke проверил отсутствие horizontal overflow, наличие `main`, русских заголовков и режима `fixtures`.
- Временные порты `3107` и `9236` после проверки закрыты.
- `make validate-spec` — пройден: `checks=68 files=390 errors=0`.
- `git diff --check` — пройден после обновления отчёта.

## Решения, требующие подтверждения

1. Добавлять ли backend endpoint истории: например `GET /api/v1/content-items/{content_id}/revisions`.
2. Когда подключать live block autosave и conflict resolution в UI.
3. Делать ли guided form renderer следующим frontend slice или сначала закрыть remaining service boundaries в Project Builder.
