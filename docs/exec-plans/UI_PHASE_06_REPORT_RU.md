# UI Phase 06 — отчёт

## Что сделано

- Экран `/app/content/new` переработан в mobile-first PWA capture flow.
- Добавлены fixture-данные для шагов записи, состояний recorder, активного блока, offline draft, resume flow, review-блоков и compact previews.
- Интерфейс показывает один активный блок на экране, запись/пауза/перезапись, транскрипт, фиксацию факта, offline queue и синхронизацию черновика.
- AI assemble disabled в offline posture с видимым объяснением.
- Добавлены compact previews для Telegram/MAX/Instagram и ссылка на desktop Content Studio.

## Найденные противоречия и открытые вопросы

- UI Phase 06 требует recording states и offline draft, но реальные browser media APIs, local persistence и background sync в этой фазе не подключались.
- Кнопка установки PWA сейчас отображает install posture, но не вызывает browser install prompt.
- Offline state показан fixture-данными, а не реальным `navigator.onLine`/service-worker состоянием.
- Нужно подтвердить, когда подключать настоящий recorder, local draft cache и синхронизацию с API.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_06_MOBILE_VOICE_PWA.md`
- Создан: `docs/exec-plans/UI_PHASE_06_REPORT_RU.md`
- Создан: `apps/web/src/features/mobile-capture/mobile-capture-fixtures.ts`
- Изменён: `apps/web/src/components/phase04/content-studio-shell.tsx`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройдено, 32 route.
- Visual smoke `/app/content/new` через Chrome DevTools Protocol — пройдено на 390/768/1280/1440 px.
- CDP layout check — `documentElement.scrollWidth` равен viewport на 390/768/1280/1440 px.
- Скриншоты: `/private/tmp/mediahub-ui06-mobile-390.png`, `/private/tmp/mediahub-ui06-mobile-768.png`, `/private/tmp/mediahub-ui06-mobile-1280.png`, `/private/tmp/mediahub-ui06-mobile-1440.png`.
- `make validate-spec` — пройдено, `checks=68 files=348 errors=0`.
- `git diff --check` — пройдено.

## Решения, которые требуют подтверждения

- Подтвердить, что `/app/content/new` остаётся главным мобильным capture entry point.
- Подтвердить, что install prompt пока показываем спокойно как posture, без агрессивного баннера.
- Подтвердить, что AI/publish actions должны быть disabled при offline до синхронизации черновика.
