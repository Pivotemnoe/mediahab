# Карта экранов и пользовательских потоков

## Публичная часть

```text
/
/features
/pricing
/login
/register
/verify-email
/forgot-password
/reset-password
```

## Личный кабинет

```text
/app/dashboard
/app/projects
/app/projects/new
/app/projects/[projectId]
/app/projects/[projectId]/settings
/app/projects/[projectId]/rubrics
/app/projects/[projectId]/rubrics/new
/app/projects/[projectId]/rubrics/[rubricId]
/app/content
/app/content/new
/app/content/[contentId]
/app/calendar
/app/media
/app/examples
/app/integrations
/app/publications
/app/billing
/app/workspace
/app/account
```

## Основные экраны

### Dashboard

- проекты;
- быстрый запуск создания поста;
- незавершённые черновики;
- ближайшие публикации;
- ошибки площадок;
- остатки лимитов тарифа.

### Project Wizard

- название;
- тематика;
- аудитория;
- тон;
- юмор;
- платформы;
- загрузка примеров;
- AI-предложение рубрик;
- подтверждение.

### Rubric Builder

- название и описание;
- поля и повторяемые группы;
- обязательность;
- источник: пользователь / AI / система;
- блокировка фактов;
- редакционные лимиты;
- платформенные стратегии;
- правила стиля;
- примеры;
- тестовая генерация.

### Content Studio

Desktop-структура:

```text
левая колонка: входные блоки и диктовка
центр: master draft и история
правая колонка: previews площадок и проверки
```

Ключевые действия:

- записать голос;
- исправить транскрипт;
- добавить повторяемый блок;
- собрать пост;
- принять/отклонить AI-предложение;
- редактировать версии площадок отдельно;
- запланировать или опубликовать.

### Mobile Capture

- выбор проекта и рубрики;
- один блок на экран;
- запись/пауза/продолжить;
- транскрипт;
- подтверждение фактов;
- следующий блок;
- сборка;
- компактный preview;
- подтверждение публикации.

### Integrations

Карточка каждой площадки:

- подключена / требует внимания / отключена;
- аккаунт или канал;
- права;
- срок действия токена;
- возможности коннектора;
- тест соединения;
- переподключение;
- отключение.

### Publications

- статус по каждой площадке;
- внешний ID и ссылка;
- попытки;
- ошибка;
- повторить;
- отменить;
- удалить на площадке, если поддерживается.

## Обязательные состояния

Для каждого важного экрана реализовать:

```text
loading
empty
error
offline
permission denied
plan limit reached
integration disconnected
partial publication success
```
