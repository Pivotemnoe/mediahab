# Phase 10 hardening runbook

## Что реализовано локально

- `schedule` нормализует naive `scheduled_at` из timezone рабочего пространства в UTC.
- `reschedule` обновляет и `publications.scheduled_at`, и pending `outbox_events.available_at`.
- `cancel` закрывает pending publish events до старта публикации.
- Повторная обработка после уже созданного `external_post` не создаёт дубль.
- PWA runtime регистрирует service worker в production и выставляет online/offline state на `documentElement`.

## Что остаётся production-зависимостью

- PostgreSQL RLS policies и проверка на реальной Postgres базе.
- Зашифрованные backup jobs для Postgres и object storage.
- Restore drill в staging.
- Offline draft queue/reconciliation для текста, аудио и медиа.
- Monitoring, alerting, structured log review и health dashboard.

## Минимальный restore drill

1. Создать staging backup базы и object storage manifest.
2. Восстановить backup в отдельную staging базу.
3. Проверить login, workspace list, project/rubric list, content item, media metadata, publication attempts и external posts.
4. Зафиксировать дату, размер backup, время восстановления и найденные расхождения.

## RLS acceptance draft

До public SaaS нужно добавить PostgreSQL policies минимум для:

- `workspaces`
- `memberships`
- `projects`
- `rubrics`
- `content_items`
- `media_assets`
- `platform_variants`
- `project_destinations`
- `publications`
- `publication_attempts`
- `external_posts`
- `outbox_events`

Representative test: запрос без workspace filter под tenant A не должен прочитать строки tenant B даже при ошибке application query.
