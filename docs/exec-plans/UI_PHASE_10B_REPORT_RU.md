# UI Phase 10b — отчёт

## Что сделано

- Добавлен первый сервисный слой UI: runtime API helper, OpenAPI-shaped DTO-типы, dashboard service и publications service.
- Добавлен режим `NEXT_PUBLIC_DATA_MODE=api | fixtures`.
- API runtime в `api` mode прокидывает server-side cookies в backend, если они доступны, но не хранит credentials в fixtures/browser storage.
- Dashboard переведён с прямого импорта fixture-массивов на `getDashboardViewModel()`.
- Publications screen переведён на `getPublicationOpsViewModel()`, а `PublicationCoreShell` теперь получает view-model.
- Default режим оставлен `fixtures`, чтобы локальная сборка не зависела от живого backend.

## Найденные противоречия и открытые вопросы

- UI roadmap требует real API contracts для всего интерфейса, но это слишком большой объём для одного безопасного коммита. В этой итерации закрыт первый вертикальный срез: dashboard + publications.
- API mode пока best-effort: для полноценной работы нужен живой backend и корректная передача authenticated session/cookies.
- Для destination labels публикаций API отдаёт `destination_id`; человекочитаемое имя требует join с destination/project data. Сейчас маппер использует безопасный fallback.

## Созданные и изменённые файлы

- Создан: `apps/web/src/services/runtime.ts`
- Создан: `apps/web/src/services/openapi-types.ts`
- Создан: `apps/web/src/services/dashboard.ts`
- Создан: `apps/web/src/services/publications.ts`
- Создан: `docs/exec-plans/UI_PHASE_10B_API_CONTRACTS.md`
- Создан: `docs/exec-plans/UI_PHASE_10B_REPORT_RU.md`
- Изменён: `apps/web/src/app/app/page.tsx`
- Изменён: `apps/web/src/app/app/publications/page.tsx`
- Изменён: `apps/web/src/components/phase06/publication-core-shell.tsx`
- Изменён: `docs/frontend/MOCK_DATA_STRATEGY.md`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `pnpm --filter @temichev/web build` — пройдено, Next.js собрал 32 маршрута.
- Chrome DevTools Protocol smoke — пройдено для `/app` и `/app/publications` на ширинах 390 и 1440 px.
- Layout smoke: `scrollWidth` совпал с viewport на всех проверенных маршрутах/ширинах.
- Service-mode smoke: на `/app` и `/app/publications` виден `fixtures` mode badge.
- Скриншоты сохранены как `/private/tmp/mediahub-ui10b-dashboard-*.png` и `/private/tmp/mediahub-ui10b-publications-*.png`.
- `make validate-spec` — пройдено: `checks=68 files=368 errors=0`.
- `git diff --check` — пройдено.

## Решения, которые требуют подтверждения

- Подтвердить, какой следующий экран переводить на service boundary: проекты/рубрики, content studio, integrations или billing.
- Подтвердить, можно ли добавлять Playwright как dev dependency для настоящего screenshot regression.
