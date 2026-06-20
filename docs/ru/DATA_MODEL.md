# Модель данных

Использовать UUID, `created_at`, `updated_at`, optimistic `version` и мягкое удаление там, где указано. Во всех пользовательских строках обязателен `workspace_id`. PostgreSQL enum применять только для стабильных системных состояний; расширяемые пользователем сущности хранить в таблицах и JSONB.

## Пользователи и рабочие пространства

- `users`: email, Argon2id-хеш, имя, подтверждение email, локаль, статус.
- `sessions`: хеш refresh/opaque token, срок, отзыв, user agent, безопасный хеш IP.
- `workspaces`: название, slug, владелец, часовой пояс, локаль, статус.
- `memberships`: workspace, user, роль, право публикации, приглашение.

## Конструктор проекта

- `projects`: стабильная сущность, `workspace_id`, slug, активная версия, статус.
- `project_versions`: неизменяемые снимки названия, описания, языка, тона, AI-режима, силы редактирования, юмора, CTA, провайдеров и правил подсчёта.
- `rubrics`: стабильная сущность рубрики, проект, slug, активная версия, статус и порядок.
- `rubric_versions`: схема ввода, UI schema, AI-режим, минимум/максимум, pipeline, правила медиа и оценок.
- `input_schemas`: JSON Schema, UI Schema, checksum.
- `project_rules`/`rule_versions`, `prompts`/`prompt_versions`, `templates`/`template_versions`: стабильная сущность плюс неизменяемые версии со scope и checksum.

## Примеры

- `example_posts`: проект, рубрика, источник, внешний ID, текст, число знаков, статус утверждения, ручная оценка, заметки, hash дубля.
- `example_metrics`: просмотры, реакции, комментарии, репосты, engagement rate.
- `example_embeddings`: провайдер, модель, размерность, vector, hash текста.
- `rejected_patterns`: запрещённый текст или regex, объяснение и критичность.

## Контент

- `content_items`: проект, точные версии проекта и рубрики, статус, текущая мастер-редакция, автор, назначенный редактор, планирование.
- `content_blocks`: поле, повторяемая группа, источник, JSON-значение, расшифровка, блокировка, голосовой файл, версия.
- `locked_facts`: нормализованные подтверждённые факты и источник.
- `content_revisions`: неизменяемые мастер- и пользовательские редакции, текст, структурированный документ, число знаков, родитель, утверждение.
- `platform_variants`: площадка, направление, мастер-источник, текст, payload, два счётчика знаков, результат валидации, утверждение.
- `media_assets`: S3-ключ, MIME, размер, checksum, тип, размеры, длительность, кодеки, статусы.
- `content_media`: роль, порядок, подпись, параметры обложки или crop.

## AI

- `provider_configs`: семейство, ключ, зашифрованные данные, настройки, состояние.
- `generation_runs`: задача, провайдер, модель, ссылки на версии правил, расход, задержка, стоимость и ошибка.
- `generation_steps`: отдельные стадии извлечения, retrieval, генерации, repair и оценки.

## Площадки и публикации

- `platforms`: системный реестр коннекторов.
- `platform_accounts`: внешний аккаунт, зашифрованные токены, scopes, срок, health.
- `project_destinations`: проект, аккаунт, channel/page ID, режим, overrides.
- `platform_capabilities`: версионируемый снимок лимитов и функций с источником `official_doc`, `live_test` или `admin_override`.
- `publications`: неизменяемый payload, idempotency key, статус, расписание, внешние ID и URL.
- `publication_attempts`: номер попытки, запрос, ответ, ошибка, возможность повтора.
- `outbox_events`: долговечная очередь из PostgreSQL.
- `webhook_inbox`: дедупликация и обработка входящих webhook.

## Биллинг

- `plans`, `prices`, `entitlements`.
- `subscriptions`.
- `usage_events` для AI, распознавания, хранения, публикаций и мест команды.
- `payments`, `invoices`, `subscription_events`, `credit_ledger`.

## Эксплуатация

- `audit_logs` — append-only.
- `notifications`.
- `feature_flags`.

## Индексы

Обязательно индексировать внешние ключи, `(workspace_id, created_at)`, `(workspace_id, status)`, уникальные slug, idempotency keys, webhook dedupe keys и outbox. Для маленькой библиотеки примеров начать с точного vector search, HNSW добавлять после измерений.
