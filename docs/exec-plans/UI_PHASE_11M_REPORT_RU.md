# UI Phase 11M — отчёт

## Что сделано

- Переработана публичная первая страница `/` как сильный вход в продукт, а не как отдельный лендинг вместо приложения.
- Hero теперь объясняет `Temichev Media Hub` как рабочий кабинет для материала, голоса, медиа, ИИ-редактуры и публикаций.
- Убрана зависимость первого экрана от preset-фото `/assets/donika-telegram.jpeg`; на главной нет копии про первый проект.
- Добавлены прямые входы:
  - `Создать материал` → `/app/content/new`;
  - `Создать кабинет` → `/register`;
  - `Как это работает` → `/features`.
- Добавлен app-like preview рабочего материала: на mobile/tablet компактная карточка состояния, на desktop фоновая сцена composer с шагами, диктовкой и платформенными preview.
- Главная явно показывает основной путь: `Мастер материала` → `Сбор без хаоса` → `ИИ-сборка и версии` → `Проверка и публикация`.
- Добавлены блоки про контроль фактов, разные правила площадок, медиа/голос/текст в одном материале и ручное подтверждение публикации.
- Исправлен публичный header на 768px: маркетинговая навигация теперь показывается с `lg`, чтобы планшетная ширина не давала горизонтальный overflow.
- Добавлен visual smoke `tools/check_public_home_visual_smoke.mjs` для `/` на 390px, 768px, 1440px и 1920px.

## Visual smoke

- `node tools/check_public_home_visual_smoke.mjs` — пройдено на 390px, 768px, 1440px и 1920px.
- Проверено:
  - горизонтального overflow нет;
  - hero и CTA видны;
  - workflow виден;
  - следующий блок виден в первом viewport;
  - ручное подтверждение публикации есть в пользовательской copy;
  - preset-specific copy `Что поесть`, `Армавир`, `У Доника` на `/` не появляется;
  - старая homepage copy и ссылка на `donika-telegram.jpeg` не используются.

Скриншоты:

- `/private/tmp/mediahub-ui11m-home-390.png`
- `/private/tmp/mediahub-ui11m-home-768.png`
- `/private/tmp/mediahub-ui11m-home-1440.png`
- `/private/tmp/mediahub-ui11m-home-1920.png`

## Проверки

- `make typecheck` — пройдено.
- `make lint` — пройдено.
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build` — пройдено.
- `make test` — пройдено: UI hardening checks, 5 общих unittest, 45 API unittest.
- `make validate-spec` — пройдено: `checks=69 files=535 errors=0`.

## Миграции

- Миграции не добавлялись.
- API-контракты не менялись.
- OpenAPI и typed frontend client не регенерировались.

## Ограничения

- Это срез публичной главной и входа в продукт; `/features`, `/pricing`, `/security`, auth-экраны и dashboard не перерабатывались.
- Desktop hero использует CSS/HTML product scene, а не новый bitmap-asset; это сделано намеренно, чтобы не тянуть preset-скриншот или проектную фотографию в универсальную главную.
- Реальная публикация в Telegram/MAX/Instagram не запускалась; изменения не касаются connector behavior.

## Следующий шаг

- Следующим срезом стоит привести `/register` и `/login` к той же сильной продуктовой подаче, чтобы переход с новой главной не попадал в более старый визуальный слой.
