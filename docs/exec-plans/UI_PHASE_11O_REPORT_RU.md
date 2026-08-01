# UI Phase 11O — отчёт

## Что изменено

- Реальный `/app` и алиас `/app/dashboard` переработаны в стартовый экран приложения:
  - крупный блок `Что создаём?`;
  - основные действия `Надиктовать материал`, `Вставить текст`, `Добавить медиа`;
  - компактная проверка площадок и ручного подтверждения;
  - блоки продолжения работы, расписания, площадок и тарифа ниже основного сценария.
- Верхняя кнопка `Создать` стала command palette:
  - `Надиктовать новый материал`;
  - `Вставить готовый текст`;
  - `Создать рубрику`;
  - `Проверить публикации`;
  - `Добавить медиа`.
- Из topbar убрана видимая dev-ссылка `UI`; navigation label `Дашборд` заменён на `Главная`.
- `/app/publications` переведён из технического publication-core экрана в пользовательскую проверку перед отправкой:
  - карточки Telegram, MAX, Instagram, ручного экспорта и вебхука;
  - отдельный блок ручного подтверждения;
  - очередь, попытки, outbox и повторы спрятаны в `Расширенный режим`.
- `/app/projects/[projectId]/builder` оформлен как отдельный advanced-конструктор проекта:
  - разделы проекта слева;
  - центральная область версионируемых настроек;
  - правый блок предпросмотра и сохранения новой версии.
- Fallback-сообщения на видимых страницах переписаны без `API-режим` и `backend недоступен`.
- Добавлен visual smoke `tools/check_premium_app_flow_visual_smoke.mjs` для реальных маршрутов и ширин 390, 768, 1440, 1920 px.

## Backend и контракты

- Backend API, OpenAPI, typed frontend client и server actions не менялись.
- Публикационные действия не менялись и не запускались из UI-среза.
- Ручное подтверждение перед публикацией сохранено в тексте и структуре `/app/publications`.

## Проверки

- `make typecheck` — прошёл.
- `make lint` — прошёл.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — прошёл.
- `make test` — прошёл, итог backend/frontend smoke: `Ran 45 tests ... OK`.
- `make validate-spec` — прошёл: `checks=69 files=541 errors=0`.
- `node tools/check_premium_app_flow_visual_smoke.mjs` — прошёл на 390, 768, 1440, 1920 px для:
  - `/app`;
  - `/app/dashboard`;
  - `/app/content/new`;
  - `/app/publications`;
  - `/app/projects/chto-poest-armavir/builder`.
- `git diff --check` — прошёл.

## Скриншоты smoke

- `/private/tmp/mediahub-ui11o-app-dashboard-390.png`
- `/private/tmp/mediahub-ui11o-app-dashboard-1440.png`
- `/private/tmp/mediahub-ui11o-app-home-1440.png`
- `/private/tmp/mediahub-ui11o-publications-1440.png`
- `/private/tmp/mediahub-ui11o-project-builder-1440.png`

## Миграции

Миграций нет.

## Ограничения

- `/app/content/[contentId]` с реальной диктовкой и bottom sheet из reference `03_premium_mobile_voice_sheet.png` остаётся следующим отдельным срезом.
- В fixture-режиме в данных может отображаться первый пресет; он не перенесён в application logic.
- Технические страницы вроде billing/account/settings ещё не проходили полный premium-redesign.

## Следующий шаг

UI Phase 11P: переработать реальную страницу материала `/app/content/[contentId]` под reference 03/04:
mobile bottom sheet для диктовки, понятный выбор блока, расшифровка/принятие, медиа и ИИ-сборка без технического шума на первом экране.
