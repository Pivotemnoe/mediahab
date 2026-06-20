# UI Phase 07 — отчёт

## Что сделано

- Экран `/app/integrations` обновлён до карточек Telegram/MAX/Instagram/Generic webhook с connection state, аккаунтом, правами, token posture и capabilities.
- Экран `/app/publications` дополнен операционными состояниями, partial success, retry/cancel/schedule posture и очередью по площадкам.
- Добавлены fixture-данные для connector cards, publication queue, attempts, schedule posture и обязательных состояний.
- Generic webhook оставлен в simulate/posture режиме без live-активации.
- Publication UI показывает независимый статус по каждой площадке: успех Telegram не скрывает retry MAX и manual_required Instagram.

## Найденные противоречия и открытые вопросы

- UI Phase 07 требует connection states, но реальные connector status API и credential flows в этой фазе не подключались.
- Schedule modal показан как posture/действие, но полноценный modal и сохранение расписания нужно подключать позже.
- Generic webhook live нельзя включать до реализации и тестов SSRF, DNS, egress, signing, verification, timeout, rate-limit, audit и kill-switch controls.
- Нужно подтвердить, где в UI позже выдавать granular `content.publish` для editor на уровне проекта.

## Созданные и изменённые файлы

- Создан: `docs/exec-plans/UI_PHASE_07_INTEGRATIONS_PUBLICATIONS.md`
- Создан: `docs/exec-plans/UI_PHASE_07_REPORT_RU.md`
- Создан: `apps/web/src/features/publication-ops/publication-ops-fixtures.ts`
- Изменён: `apps/web/src/app/app/integrations/page.tsx`
- Изменён: `apps/web/src/components/phase06/publication-core-shell.tsx`
- Изменён: `SPEC_MANIFEST.json`
- Изменён: `reference/VALIDATION_REPORT.md`

## Результаты тестов и проверок

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройдено, 32 route.
- Visual smoke `/app/integrations` и `/app/publications` через Chrome DevTools Protocol — пройдено на 390/768/1280/1440 px.
- CDP layout check — `documentElement.scrollWidth` равен viewport на 390/768/1280/1440 px для обеих страниц.
- Скриншоты: `/private/tmp/mediahub-ui07-integrations-390.png`, `/private/tmp/mediahub-ui07-integrations-768.png`, `/private/tmp/mediahub-ui07-integrations-1280.png`, `/private/tmp/mediahub-ui07-integrations-1440.png`, `/private/tmp/mediahub-ui07-publications-390.png`, `/private/tmp/mediahub-ui07-publications-768.png`, `/private/tmp/mediahub-ui07-publications-1280.png`, `/private/tmp/mediahub-ui07-publications-1440.png`.
- `make validate-spec` — пройдено, `checks=68 files=351 errors=0`.
- `git diff --check` — пройдено.

## Решения, которые требуют подтверждения

- Подтвердить, что Generic webhook остаётся simulate by default в UI.
- Подтвердить, что retry/cancel/schedule пока остаются UI posture без backend mutation.
- Подтвердить, что Instagram live не показываем как доступный до Meta readiness.
