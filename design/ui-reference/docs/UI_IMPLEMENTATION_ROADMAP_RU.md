# План реализации frontend

## UI Phase 00 — анализ и фундамент

Результат:

- карта маршрутов;
- карта компонентов;
- дизайн-токены;
- решение по состояниям данных;
- mock service layer;
- план responsive;
- перечень открытых вопросов.

Код продуктовых экранов пока не строить.

## UI Phase 01 — design system и app shell

- глобальная тема;
- компоненты базового уровня;
- marketing shell;
- auth shell;
- cabinet shell;
- sidebar/topbar/mobile navigation;
- Storybook или внутренний component showcase.

## UI Phase 02 — landing, auth, dashboard

- главная рекламная страница;
- возможности;
- тарифы;
- вход/регистрация/восстановление;
- dashboard с мок-данными;
- responsive и состояния.

## UI Phase 03 — Project Wizard

- создание проекта;
- AI-предложение рубрик как mock workflow;
- выбор площадок;
- стиль и аудитория;
- загрузка примеров;
- итоговое подтверждение.

## UI Phase 04 — Rubric Builder

- список рубрик;
- создание и редактирование;
- динамические поля;
- repeatable groups;
- лимиты;
- правила;
- preview формы;
- version draft indicator.

## UI Phase 05 — Content Studio desktop

- блоки ввода;
- диктовка как mock;
- транскрипт;
- master draft;
- AI suggestions;
- fact locking;
- platform previews;
- character counters;
- autosave status.

## UI Phase 06 — Mobile Voice PWA

- пошаговый сценарий;
- recording states;
- offline draft;
- resume flow;
- review and assemble;
- compact previews;
- installable PWA shell.

## UI Phase 07 — Integrations and Publications

- cards Telegram/MAX/Instagram;
- connection state;
- capabilities;
- publication queue;
- partial success;
- retry/cancel;
- schedule modal.

## UI Phase 08 — Examples, Media, Calendar

- библиотека примеров;
- импорт;
- фильтры;
- медиа-библиотека;
- календарь;
- drag-and-drop scheduling later.

## UI Phase 09 — Billing, account, workspace

- pricing;
- current plan;
- usage;
- pay button placeholder;
- invoices placeholder;
- team roles;
- account settings.

## UI Phase 10 — hardening

- подключение реальных API-контрактов;
- accessibility audit;
- Playwright e2e;
- screenshot regression;
- performance;
- error boundaries;
- telemetry hooks;
- final responsive pass.

## Правило прохождения

Каждый этап заканчивается:

```text
lint
unit tests
Playwright smoke tests
screenshots for 390/768/1280/1440 widths
changed files list
open questions
```

Переход дальше — только после подтверждения.
