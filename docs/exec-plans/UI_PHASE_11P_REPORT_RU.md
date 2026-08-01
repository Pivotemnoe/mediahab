# Отчёт UI Phase 11P — новый shell приложения и рабочий composer

Дата: 2026-07-08.

## Что изменено

- Убран старый постоянный левый sidebar из обычного authenticated shell.
- Верхняя панель теперь работает как компактная навигация приложения: бренд, основные разделы, поиск, действие `Создать`, аккаунт.
- `/app/content/new` заменён на цельный экран создания материала:
  - выбор проекта и рубрики;
  - блоки материала;
  - быстрые действия `Запись`, `Вставить текст`, `Загрузить аудио или медиа`;
  - превью Telegram, MAX, Instagram;
  - явная заметка, что публикация остаётся ручной.
- `/app/content/[contentId]` заменён на рабочий composer:
  - блоки слева на desktop;
  - центральная поверхность диктовки/текста/медиа;
  - превью площадок справа;
  - мобильная bottom-sheet-подача записи;
  - технические поля, факт-локи, проверки и история перенесены в `Расширенный режим`.
- Панель диктовки адаптирована под 390px: кнопки и длинные подписи переносятся без обрезания.
- Сохранены backend-действия существующего `PilotVoiceTelegramPanel`: запись, загрузка аудио, расшифровка, принятие текста, медиа, ИИ-разбор, сборка, подготовка Telegram и ручная публикация.
- Добавлен визуальный smoke `tools/check_premium_app_flow_visual_smoke.mjs` для ключевых экранов и ширин.

## Backend и API

- API-контракты не менялись.
- OpenAPI и typed frontend client не регенерировались, потому что контрактов не касались.
- Миграций нет.
- Ручное подтверждение публикации сохранено.

## Проверки

- `make typecheck` — passed.
- `make lint` — passed.
- `pnpm --filter @temichev/web build` — passed.
- `make test` — passed, 45 backend/API tests OK плюс JS contract checks.
- `make validate-spec` — passed, `checks=69 files=544 errors=0`.
- `git diff --check` — passed.
- `node tools/check_premium_app_flow_visual_smoke.mjs` — passed:
  - маршруты: `/app`, `/app/dashboard`, `/app/content/new`, `/app/content/demo-lunch`, `/app/publications`, `/app/projects/chto-poest-armavir/builder`;
  - ширины: 390, 768, 1440, 1920;
  - `hasOldSidebar=false`;
  - `scrollWidth` равен ширине viewport;
  - старые запрещённые формулировки не найдены.

## Скриншоты

- `/private/tmp/mediahub-ui11p-new-content-390.png`
- `/private/tmp/mediahub-ui11p-new-content-1440.png`
- `/private/tmp/mediahub-ui11p-content-composer-390.png`
- `/private/tmp/mediahub-ui11p-content-composer-1440.png`
- Дополнительные smoke-скриншоты для home, dashboard, publications и project builder лежат рядом с префиксом `/private/tmp/mediahub-ui11p-*`.

## Ограничения

- Эта фаза не переделывала все служебные разделы (`settings`, `billing`, `account`, часть admin-like экранов). Они остаются следующими кандидатами на упрощение.
- `Что поесть? Армавир` отображается как данные fixture/preset, не добавлялся как новая application logic.
- Production deploy не выполнялся.

## Следующий шаг

Следующий небольшой срез: довести `/app/content` и `/app/projects` до того же app-first уровня, чтобы список материалов и выбор проекта не выглядели как административные таблицы, но продолжали открывать текущие backend-backed материалы и настройки.
