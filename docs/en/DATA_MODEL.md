# Data model

Use UUID primary keys, `created_at`, `updated_at`, optimistic `version`, and soft deletion where noted. All tenant-owned rows contain non-null `workspace_id`. Use PostgreSQL enums only for stable system states; use lookup/configuration tables for user-extensible concepts.

## Identity and tenancy

### `users`

- `id`
- `email` unique, normalized
- `password_hash`
- `display_name`
- `email_verified_at`
- `locale`
- `status`
- timestamps

### `sessions`

- `id`
- `user_id`
- `refresh_token_hash` or opaque session hash
- `user_agent`, `ip_hash`
- `expires_at`, `revoked_at`, `last_seen_at`

### `workspaces`

- `id`
- `name`, `slug`
- `owner_user_id`
- `timezone`, `default_locale`
- `status`
- `deleted_at`

### `memberships`

- `workspace_id`, `user_id`
- `role`
- `publication_permission`
- `invited_by`, `accepted_at`

Unique: `(workspace_id, user_id)`.

## Project constructor

### `projects`

Stable identity only:

- `id`, `workspace_id`
- `slug`
- `active_version_id`
- `status`
- `created_by`
- `deleted_at`

### `project_versions`

Immutable snapshots:

- `id`, `workspace_id`, `project_id`
- `version_number`
- `name`, `description`, `language`
- `tone_config` JSONB
- `ai_mode_default`
- `editing_strength`
- `humor_config` JSONB
- `cta_config` JSONB
- `provider_preferences` JSONB
- `character_count_policy`
- `created_by`, `created_at`

Unique: `(project_id, version_number)`.

### `rubrics`

- `id`, `workspace_id`, `project_id`
- `slug`
- `active_version_id`
- `status`: active, archived
- `sort_order`

### `rubric_versions`

Immutable:

- `id`, `workspace_id`, `rubric_id`
- `version_number`
- `name`, `description`
- `input_schema_id`
- `ui_schema` JSONB
- `ai_mode`
- `editorial_min_chars` nullable
- `editorial_max_chars`
- `generation_pipeline` JSONB
- `media_policy` JSONB
- `rating_policy` JSONB
- `created_by`, `created_at`

### `input_schemas`

- `id`, `workspace_id`
- `schema_version`
- `json_schema` JSONB
- `ui_schema` JSONB
- `checksum`

### Rules, prompts, and templates

Use stable parent plus immutable version rows:

- `project_rules` / `rule_versions`
- `prompts` / `prompt_versions`
- `templates` / `template_versions`

Each version includes scope (`workspace`, `project`, `rubric`, `platform`, `task`), content, structured settings, checksum, author, and timestamps.

## Examples and retrieval

### `example_posts`

- `id`, `workspace_id`, `project_id`
- `rubric_id` nullable until classified
- `source_type`: manual, json, telegram_export, connector
- `source_external_id`
- `title`, `text`
- `character_count`
- `approval_status`
- `manual_quality_score`
- `style_version_id`
- `notes`
- `dedupe_hash`
- timestamps

### `example_metrics`

- `example_post_id`
- `views`, `reactions`, `comments`, `shares`
- `engagement_rate`
- `captured_at`

### `example_embeddings`

- `example_post_id`
- `provider`, `model`, `dimensions`
- `embedding vector`
- `content_hash`

### `rejected_patterns`

- `id`, `workspace_id`, `project_id`, `rubric_id` nullable
- `pattern_type`
- `text_or_regex`
- `explanation`
- `severity`

## Content

### `content_items`

- `id`, `workspace_id`, `project_id`
- `rubric_id`, `rubric_version_id`, `project_version_id`
- `title_internal`
- `status`
- `current_master_revision_id`
- `created_by`, `assigned_to`
- `scheduled_at` nullable
- timestamps, `deleted_at`

### `content_blocks`

Stores source fields and repeatable groups:

- `id`, `workspace_id`, `content_item_id`
- `field_key`
- `group_key`, `group_index` nullable
- `source_type`: user_text, voice, import, ai_suggested
- `value_json` JSONB
- `transcript_text` nullable
- `is_locked`
- `source_media_id` nullable
- `revision_number`

### `locked_facts`

Normalized facts for validation:

- `id`, `workspace_id`, `content_item_id`
- `fact_key`
- `value_json`
- `source_block_id`
- `locked_by`, `locked_at`

### `content_revisions`

- `id`, `workspace_id`, `content_item_id`
- `revision_number`
- `revision_type`: master, user_edit, ai_draft
- `text`
- `structured_document` JSONB
- `character_count`
- `generation_run_id` nullable
- `parent_revision_id`
- `approved_by`, `approved_at`
- immutable after creation

### `platform_variants`

- `id`, `workspace_id`, `content_item_id`
- `platform_key`
- `destination_id`
- `source_master_revision_id`
- `variant_revision_number`
- `text`
- `structured_payload` JSONB
- `character_count_editorial`
- `character_count_connector`
- `validation_result` JSONB
- `status`
- `approved_by`, `approved_at`

### `media_assets`

- `id`, `workspace_id`
- `storage_key`, `bucket`
- `kind`: image, video, audio, voice, document
- `mime_type`, `size_bytes`, `checksum`
- dimensions, duration, codec metadata
- `upload_status`, `processing_status`
- `created_by`
- retention/deletion fields

### `content_media`

- `content_item_id`, `media_asset_id`
- `role`
- `sort_order`
- `caption` nullable
- crop/cover metadata JSONB

## AI and speech

### `provider_configs`

- `id`, `workspace_id` nullable for system provider
- `provider_family`
- `provider_key`
- encrypted credentials
- configuration JSONB
- `enabled`, `last_verified_at`

### `generation_runs`

- `id`, `workspace_id`, `content_item_id`
- `task_type`
- `provider_key`, `model_id`
- prompt/rule/rubric version references
- status, latency, input/output usage, cost estimate
- error fields

### `generation_steps`

One run may include extraction, retrieval, generation, repair, and evaluation steps. Store request/response metadata with sensitive data redaction.

## Destinations and publication

### `platforms`

System registry:

- `key`: telegram, max, instagram, threads, youtube, manual_export, generic_webhook
- display metadata
- `connector_kind`
- current policy version

### `platform_accounts`

- `id`, `workspace_id`, `platform_key`
- external account IDs and display name
- encrypted access/refresh tokens or bot token
- scopes, expiry, health state
- `last_verified_at`

### `project_destinations`

- `id`, `workspace_id`, `project_id`
- `platform_account_id` nullable for manual
- external channel/page ID
- display name
- default publication mode
- enabled
- overrides JSONB

### `platform_capabilities`

Versioned tested capability snapshot per connector/account where needed:

- hard limits
- media support
- edit/delete support
- tested_at
- source: official_doc, live_test, admin_override

### `publications`

- `id`, `workspace_id`
- `content_item_id`, `platform_variant_id`, `destination_id`
- immutable payload snapshot JSONB
- idempotency key unique
- status
- scheduled/started/completed timestamps
- external URL and IDs

### `publication_attempts`

- `publication_id`
- attempt number
- request and normalized response metadata
- connector error class/code
- retryable flag
- next retry
- timestamps

### `outbox_events`

- aggregate type/id
- event type
- payload JSONB
- available, processed, failed timestamps
- retry count

### `webhook_inbox`

- platform/provider
- dedupe key unique
- headers/payload with secret redaction
- verification status
- processed status and error

## Billing

### `plans`, `prices`, `entitlements`

Plans reference editable entitlement keys and numeric/boolean values.

### `subscriptions`

- workspace, plan, status
- provider/customer/subscription IDs
- current period
- trial/cancel fields

### `usage_events`

Append-only events for generations, transcription seconds, storage bytes, publications, and seats. Aggregate asynchronously for dashboards but enforce using authoritative events/counters.

### `payments`, `invoices`, `subscription_events`, `credit_ledger`

Designed for provider adapters and idempotent webhook processing.

## Operations

- `audit_logs`: append-only actor/action/resource/diff metadata.
- `notifications`: in-app/email delivery state.
- `feature_flags`: system, workspace, or user scope.

## Indexing requirements

At minimum:

- All foreign keys indexed.
- `(workspace_id, created_at)` on tenant activity tables.
- `(workspace_id, status)` on content/publication/jobs.
- Unique slugs within workspace/project scope.
- Unique outbox/webhook/idempotency keys.
- Vector index selected after measuring data volume; begin exact search for small libraries, add HNSW when justified.
