# Temichev Media Hub — Master Product and Technical Specification

**Document status:** implementation baseline  
**Canonical language:** English  
**Product owner:** Konstantin Temichev  
**Checked against official platform documentation:** 2026-06-20

---

## 1. Executive summary

Temichev Media Hub is a mobile-first PWA and multi-tenant SaaS content studio. A user creates a workspace, creates one or more content projects, defines rubrics and structured input flows, records or types source material, lets an AI editor assemble a controlled master draft, reviews suggested hooks and ratings, generates separate variants for each platform, and publishes through supported connectors.

The first production preset is **“Что поесть? Армавир”**. It is a reference implementation, acceptance fixture, and initial real-world customer project. It must not be hardcoded into application logic.

The initial supported destinations are:

- Telegram channel publication.
- MAX channel publication.
- Instagram professional-account publication.

The architecture must also reserve clean extension points for:

- Threads.
- YouTube video metadata, comments, captions, and manual Community drafts.
- Website webhook/export.
- Other manual-export or generic-webhook destinations.

The product must be useful to one owner on a modest VPS, but its tenancy, billing, authorization, configuration, and connector architecture must allow later commercial SaaS operation.

---

## 2. Product principles

### 2.1 Configuration over hardcoding

Projects, rubrics, fields, editorial limits, prompts, rules, examples, CTAs, platform assignments, AI provider preferences, and publication settings are stored in PostgreSQL and managed through the frontend. YAML and JSON files are only presets, fixtures, import/export formats, and documentation.

### 2.2 Content item, not Telegram post

The core editorial entity is a `ContentItem`. It represents one piece of content independent of a destination. A content item can produce a master draft and many platform variants.

```text
Workspace
  └── Project
      └── RubricVersion
          └── ContentItem
              ├── Source blocks
              ├── Master revision
              ├── Telegram variant
              ├── MAX variant
              ├── Instagram variant
              └── Future variants
```

### 2.3 AI editor before AI author

For the “Что поесть? Армавир” preset, AI behaves primarily as an editor:

- The user provides factual observations.
- AI may improve structure, flow, clarity, humor, hook, transitions, CTA, and suggested ratings.
- AI must not invent dishes, prices, addresses, service details, or conclusions.
- The target strength is a light rewrite, approximately 10–15%, not a replacement of the user’s voice.
- A human approves every final variant before publication in the initial release.

Other projects may select `author`, `editor`, or `adapter` modes per rubric.

### 2.4 Layered context instead of one giant prompt

Generation is assembled from versioned layers:

1. System safety and output contract.
2. Workspace policy.
3. Project rules.
4. Rubric rules and field schema.
5. Platform policy when adapting.
6. Retrieved approved examples.
7. Current locked factual input.
8. Current user instruction.

No single opaque prompt should contain the entire product state.

### 2.5 Editorial targets are different from platform hard limits

A rubric can target 3,500–4,100 characters while a platform may impose a lower technical limit. Store separate fields:

- `editorial_min_chars`
- `editorial_max_chars`
- `platform_target_min_chars`
- `platform_target_max_chars`
- `platform_hard_max_chars`

The connector owns the technical hard limit. The user may edit editorial targets but may not override an official hard limit beyond the connector capability.

### 2.6 Reliable, independent publication

Telegram, MAX, and Instagram publication attempts are independent. Failure on one platform must not roll back successful publication on another. Every attempt is idempotent, logged, retryable, and connected to an immutable payload revision.

---

## 3. Users, workspaces, and tenancy

### 3.1 Identity hierarchy

```text
User
  └── Membership
      └── Workspace
          ├── Projects
          ├── Connected accounts
          ├── Subscription
          ├── Usage ledger
          └── Team members
```

A user may belong to multiple workspaces. A workspace may contain multiple projects and members.

### 3.2 Roles

- `owner`: billing, deletion, integrations, members, all content.
- `admin`: projects, integrations, members except ownership transfer, all content.
- `editor`: content, media, examples, publication preparation; publication permission is configurable.
- `viewer`: read-only.

Initial personal deployment may expose only `owner`, but the schema and authorization layer must support all roles from the start.

### 3.3 Tenant isolation

- Every tenant-owned table includes `workspace_id`.
- Every backend query is scoped by workspace.
- Cross-workspace object identifiers must return `404`, not reveal existence.
- PostgreSQL Row-Level Security is required before public SaaS launch and should be introduced as an explicit hardening phase.
- Background tasks carry both `workspace_id` and object ID and re-check ownership before execution.

---

## 4. Public site and authenticated application

### 4.1 Public routes

```text
/
/features
/pricing
/security
/contacts
/login
/register
/verify-email
/forgot-password
/reset-password
/terms
/privacy
```

The landing page explains the product, supported platforms, project constructor, rubric generator, voice workflow, AI editor, examples library, publication preview, and future tariff options.

### 4.2 Authenticated routes

```text
/app
/app/dashboard
/app/projects
/app/projects/new
/app/projects/[projectId]
/app/projects/[projectId]/builder
/app/projects/[projectId]/rubrics
/app/projects/[projectId]/rules
/app/projects/[projectId]/examples
/app/projects/[projectId]/integrations
/app/content
/app/content/new
/app/content/[contentId]
/app/calendar
/app/media
/app/publications
/app/billing
/app/workspace
/app/account
```

### 4.3 Dashboard

Display:

- Projects.
- “Create content” action.
- Recent drafts.
- Scheduled and recent publications.
- Failed publication alerts.
- Subscription and usage summary.
- Integration health.

---

## 5. Project Builder

### 5.1 Create-project wizard

The wizard collects:

1. Project name and slug.
2. Description and content domain.
3. Primary language.
4. Target audience.
5. Content goals.
6. Voice and tone.
7. Humor preference.
8. Default AI mode.
9. Desired platforms.
10. Existing examples.
11. Desired publishing frequency.
12. Whether AI should propose rubrics.

The user may:

- Create from scratch.
- Create from a preset.
- Clone an existing project.
- Import a project package.

### 5.2 AI rubric generator

The user describes the project in natural language. The AI returns structured rubric suggestions conforming to `rubric.schema.json`. Each suggestion includes:

- Name and purpose.
- Recommended source fields.
- Required and optional fields.
- Repeatable groups.
- Editorial length range.
- Recommended media role.
- AI mode.
- Suggested generation steps.
- Suggested platform adaptation strategies.

The user must approve, edit, or reject each suggestion. AI output never becomes active configuration automatically.

### 5.3 Project settings

The frontend must allow editing:

- Name, logo, description, language.
- Voice and tone.
- Humor and editing strength.
- Default CTA blocks.
- Forbidden phrases and patterns.
- Required disclosures.
- Default AI providers and fallback order.
- Default platform destinations.
- Active and archived rubrics.
- Examples and quality labels.
- Project-level character-count policy.

All changes create a new project configuration version.

---

## 6. Rubric Builder

### 6.1 Dynamic field types

A rubric input form is generated from a versioned JSON Schema plus UI schema. Supported field types:

- Short text.
- Long text.
- Voice note.
- Number.
- Money.
- Date/time.
- Address/location.
- Single select.
- Multi-select.
- Boolean.
- Rating.
- Media picker.
- Repeatable group.
- Custom block.

### 6.2 Field metadata

Each field supports:

- Stable key.
- Human label and helper text.
- Required/optional.
- User input, imported, AI-suggested, system-generated, or computed source.
- Lock after confirmation.
- Validation rules.
- Prompt hint.
- Display order.
- Conditional visibility.
- Repeatable minimum and maximum.

### 6.3 Generated fields

Fields such as hook, ratings, transitions, CTA, platform summaries, and metadata may be declared as generated. Generated fields are editable and preserve provenance:

```json
{
  "key": "hook",
  "source": "ai_suggested",
  "generation_stage": "master_assembly",
  "editable": true,
  "locked": false
}
```

### 6.4 Versioning

Publishing always references the exact rubric version used to create the content item. Editing a rubric creates a new version and does not mutate historical content.

---

## 7. Content Studio and dictation workflow

### 7.1 Primary workflow for “Что поесть? Армавир”

The user selects project and rubric. The app then guides the user through factual blocks. For `Обзор недели`:

1. Basic information: venue, address, check, context.
2. Atmosphere and service.
3. Dish group, repeatable as needed.
4. Drinks or dessert, optional and repeatable.
5. Overall conclusion.
6. Media selection and ordering.
7. “Assemble post.”

The user is not required to invent or dictate:

- Hook.
- Ratings.
- Transitions.
- CTA.

These are generated after all factual material is available.

### 7.2 Voice capture

- Record in the PWA using browser media APIs.
- Pause, resume, cancel, and re-record each block.
- Upload audio directly to S3 using a presigned URL.
- Run speech-to-text asynchronously.
- Show the transcript beside the audio.
- Let the user correct the transcript before locking facts.
- Store original audio, transcript, provider, timestamps, and confidence metadata when available.

The architecture must also allow a later Telegram intake bot that creates or appends blocks to a content item.

### 7.3 Autosave and offline behavior

- Autosave text changes locally and to the API.
- Drafts must survive page reload and temporary network loss.
- Offline mode may queue local text changes and audio upload metadata; publication and AI generation require connectivity.
- Resolve conflicts explicitly rather than silently overwriting a newer server revision.

### 7.4 Fact locking

Confirmed factual fields are stored as normalized facts and marked locked. AI may quote or paraphrase them but may not change values. A fact-lock validator compares generated structured output against locked facts and blocks approval when a contradiction is detected.

---

## 8. AI content engine

### 8.1 Provider families

Use separate interfaces:

```text
TextGenerationProvider
SpeechToTextProvider
EmbeddingProvider
ModerationProvider (optional extension)
```

Initial text providers:

- OpenAI.
- YandexGPT.
- GigaChat.

Initial speech providers:

- OpenAI transcription.
- Yandex SpeechKit.
- Local Whisper-compatible provider later.

Initial embedding providers:

- OpenAI embeddings.
- A Russian-accessible provider or local multilingual embedding model through the same interface.

### 8.2 Provider configuration

Provider credentials are stored per system or workspace, encrypted at rest. Project settings select a preferred provider and fallback order by task:

- Fact extraction.
- Master assembly.
- Hook generation.
- Ratings suggestion.
- Platform adaptation.
- Quality check.
- Embeddings.
- Speech-to-text.

Model IDs are configuration, not source constants.

### 8.3 Structured outputs

Every machine-consumed AI response uses a strict JSON schema when the provider supports it. When a provider does not guarantee schema adherence, validate, repair once, then fail visibly. Never parse business-critical fields from free-form prose with fragile regular expressions.

### 8.4 Generation stages

```text
Raw voice/text
  → transcription
  → structured fact extraction
  → user correction and fact lock
  → example retrieval
  → master draft assembly
  → hook suggestion
  → ratings suggestion
  → CTA assembly
  → fact-lock validation
  → style and quality evaluation
  → user review
  → platform adaptation
  → platform validation
  → publication approval
```

### 8.5 Example retrieval

Approved examples are embedded and stored in PostgreSQL with pgvector. For one generation, retrieve a small relevant set, not the entire library:

- 3–5 strong examples from the same rubric.
- Up to 2 semantically similar examples.
- Optional rejected-pattern examples.

Ranking considers:

- Rubric match.
- Semantic similarity.
- Manual quality score.
- Engagement rate where available.
- Recency and active style version.

### 8.6 Example import

Support:

- Manual text paste.
- JSON upload.
- Telegram export JSON import.
- Future connector-based import.

Import pipeline:

1. Parse and normalize.
2. Deduplicate.
3. Calculate character count.
4. Attach available reaction, view, comment, and share metrics.
5. Suggest rubric.
6. Require user approval.
7. Generate embedding.

### 8.7 Quality gates

Before a master draft can be approved, check:

- No locked fact changed or invented.
- Required sections present.
- Editorial length target.
- Forbidden phrases absent.
- Tone and editing-strength policy.
- Ratings use the configured scale.
- CTA rules.
- No unsupported medical, legal, or other regulated claims for projects that enable such validators.

The UI shows warnings and errors separately. Errors block publication; warnings may be acknowledged.

### 8.8 AI usage and cost

Record every generation run:

- Workspace, project, content item.
- Task type.
- Provider and model.
- Prompt/version identifiers.
- Input and output token/character usage when available.
- Latency.
- Cost estimate.
- Success/failure.
- Retry chain.

This data feeds subscription entitlements and future billing.

---

## 9. Platform variants and character counting

### 9.1 Master and variants

The master revision is editorially complete but not necessarily publishable everywhere. Each destination has its own immutable variant revision.

```text
Master revision
  ├── Telegram variant
  ├── MAX variant
  ├── Instagram variant
  ├── Threads variant
  ├── YouTube metadata package
  └── Website export
```

### 9.2 Counting policy

- Editorial count includes spaces, line breaks, and emoji as normalized Unicode text.
- Store both the editorial count and connector-calculated count.
- Each connector performs final validation on the rendered payload after escaping and formatting.
- The frontend must never imply that one generic count guarantees platform acceptance.

### 9.3 Preview

Each platform preview displays:

- Rendered text.
- Character count against target and hard limit.
- Media order and compatibility.
- Formatting warnings.
- Destination account.
- Publication mode.
- Validation status.

The user may edit one platform variant without altering the master or other variants.

---

## 10. Platform connectors

### 10.1 Connector contract

Every built-in connector implements:

```text
capabilities()
connect()
refresh_credentials()
validate_variant()
prepare_media()
publish()
get_status()
edit()
delete()
normalize_error()
```

A connector advertises runtime capabilities, including text limits, media types, item limits, edit/delete support, OAuth needs, and current feature flags.

### 10.2 Telegram

Primary automated mode is Telegram Bot API Rich Messages:

- `sendRichMessage`.
- Rich text plus `tg-collage` or `tg-slideshow` media blocks.
- Official hard limits at specification time: 32,768 UTF-8 characters and 50 media attachments.
- Rich media URLs must be HTTP(S), so the publication job generates sufficiently long-lived signed S3 delivery URLs.

Required fallback:

- `sendMediaGroup` for 2–10 media items plus a separate text message.
- Fallback must not happen silently; show the mode before approval and record the resulting external message IDs.

Reference acceptance fixture:

- 4,069 text characters.
- 7 photos and 3 videos.
- One visible channel publication with the text below the collage.
- Bold sections, emoji, and links preserved.

Project editorial targets remain much lower than Telegram’s technical limit. For `Обзор недели`, Telegram target is 3,500–4,100 characters.

### 10.3 MAX

- Publish through the official Bot API.
- Text hard limit: 4,000 characters.
- Support Markdown or HTML formatting through a connector formatter.
- Upload media through `POST /uploads`, wait for processing readiness, and retry `attachment.not.ready` with exponential backoff.
- Keep requests within documented API rate guidance.
- Use production webhooks over HTTPS with a trusted certificate.
- Do not invent a media-item count if official documentation does not state one; determine and record the tested capability during Phase 00.

For a 4,100-character editorial master, the MAX variant must be compressed to no more than 4,000 characters.

### 10.4 Instagram

- Support professional accounts through the official Instagram API.
- Support single image/video, carousel, and Reel connectors as capabilities allow.
- Caption hard limit: 2,200 characters.
- Carousel: 2–10 media items.
- Hashtags and mentions must be validated by the connector.
- Check current content-publishing quota through the API before publication rather than relying only on a hardcoded daily number.
- Media must be reachable by Meta during container creation and processing; signed URLs need adequate TTL.
- Use two-phase container creation/status polling/publication.
- Expose `manual_required` when account permissions, review state, quota, or media constraints prevent automatic publication.

Instagram gets a deliberate condensed variant, never a blind truncation of the Telegram text.

### 10.5 Threads — prepared extension

- Official API connector interface reserved.
- Text hard limit at specification time: 500 characters.
- Support text, image, video, and carousel when implemented.
- Variant strategy: one hook, one key point or verdict, one CTA/link.

### 10.6 YouTube — prepared extension

Supported future automated operations:

- Video upload.
- Title, description, tags, category, language, privacy, and scheduled publication metadata.
- Caption track upload.
- Top-level comments and replies, subject to API authorization and rules.

Prepared but manual in the initial product:

- Community post draft, media package, and copy action. Do not promise automatic Community publication without an official supported API resource.

YouTube content package fields:

```text
title
description
tags
chapters
pinned_comment_draft
category
privacy
publish_at
caption_file
community_draft
```

### 10.7 Website and custom destinations

Provide two generic destination types:

- `manual_export`: copy/download rendered text and media package.
- `generic_webhook`: signed outbound HTTP request to a configured endpoint.

A website-specific connector can later consume the webhook or use a dedicated API.

### 10.8 Platform Builder boundary

The user may create platform profiles, limits for manual destinations, format templates, and webhook destinations through the UI. The user cannot produce a full automatic social-network integration without code. A built-in automatic connector is a versioned backend module with tests.

---

## 11. Publication engine

### 11.1 Publication model

One `Publication` per content variant and destination. One or more `PublicationAttempt` records per publication.

Statuses:

```text
draft
awaiting_approval
scheduled
queued
preparing_media
publishing
processing
published
failed_retryable
failed_permanent
manual_required
cancelled
deleted
```

### 11.2 Durability

- API transaction writes the publication row and an outbox event in PostgreSQL.
- An outbox dispatcher submits the task to Celery.
- Redis is transport, not the only source of truth.
- Worker locks the publication using an idempotency key.
- Every retry references the same immutable payload revision.

### 11.3 Retry rules

- Exponential backoff with jitter.
- Connector-specific retryable error classification.
- Maximum attempts configurable.
- Dead-letter/final failure state visible in UI.
- Manual retry button.
- No duplicate external publication after worker crash or timeout.

### 11.4 Scheduling

- Store timestamps in UTC; display in workspace timezone.
- Celery beat or an equivalent scheduler only enqueues due durable jobs.
- Re-check subscription entitlement, credentials, variant validity, and destination health at execution time.
- Support cancellation before publication starts.

### 11.5 Edit and delete

Expose only when the connector advertises support. Preserve original revision and external IDs. All actions are audited.

---

## 12. Billing and subscriptions

### 12.1 MVP behavior

The first release includes:

- Public pricing page.
- Billing page in the cabinet.
- Plans and entitlements in the database.
- Current plan, usage, and limits.
- “Pay subscription” button with `coming_soon` or mock provider.
- Manual plan assignment by a system administrator.
- Real backend enforcement of limits.

### 12.2 Billing data model

```text
plans
prices
entitlements
subscriptions
subscription_events
payment_customers
payments
invoices
usage_events
credit_ledger
```

### 12.3 Example entitlements

- Maximum workspaces or projects.
- Maximum active rubrics.
- Connected automatic destinations.
- AI text generations.
- Speech-to-text minutes.
- Embedding volume.
- Storage quota.
- Scheduled publications.
- Team seats.

Do not finalize commercial numbers in code. Seed editable plan records.

### 12.4 Provider adapters

Payment providers use a common backend interface. Prepare adapters for Russian providers such as YooKassa or CloudPayments and an international provider later. Initial implementation uses `MockPaymentProvider`.

Payment webhooks must be verified, idempotent, and processed through a durable inbox.

---

## 13. Authentication and security

### 13.1 Authentication

Initial authentication:

- Email and password.
- Email verification.
- Password reset.
- Secure browser session.
- Session revocation and logout from all devices.

Use:

- Argon2id password hashing.
- Short-lived access token or opaque session in Secure, HttpOnly, SameSite cookies.
- Rotating refresh/session tokens stored hashed in PostgreSQL.
- CSRF protection for cookie-authenticated state changes.
- Rate limits and lockout/backoff for authentication abuse.

Do not store bearer credentials in browser `localStorage`.

### 13.2 Integration credentials

- Encrypt tokens and secrets at rest using an application encryption key supplied outside the database.
- Store token expiry, scopes, refresh state, and last validation time.
- Redact secrets from structured logs and error tracking.
- Allow disconnect and revocation.

### 13.3 Audit

Audit events include:

- Login and security changes.
- Workspace/member changes.
- Project/rubric/rule/prompt configuration versions.
- Integration connect/disconnect.
- AI generation and approval.
- Publication, edit, delete, retry, and cancellation.
- Billing and plan changes.

### 13.4 Data lifecycle

- Soft-delete configurable entities.
- Preserve published revisions and audit records.
- Support workspace export and deletion workflow before public launch.
- Define retention for raw voice files, generated delivery URLs, logs, and failed payloads.

---

## 14. Technology stack

### 14.1 Frontend

- Next.js App Router.
- React.
- TypeScript with strict mode.
- Node.js LTS, pinned in toolchain configuration.
- pnpm workspace.
- Tailwind CSS.
- shadcn/ui and Radix primitives.
- React Hook Form plus Zod for dynamic forms.
- TanStack Query for API server state where appropriate.
- dnd-kit for reorderable media and fields.
- Generated TypeScript API client from FastAPI OpenAPI.
- PWA manifest, service worker, installability, update flow, and offline draft support.

### 14.2 Backend

- Python 3.13 baseline for broad dependency compatibility; pin a tested patch release.
- FastAPI.
- Pydantic v2.
- SQLAlchemy 2.x async ORM/core.
- Alembic migrations.
- PostgreSQL driver: asyncpg.
- HTTP client: httpx.
- Dependency management: `uv` with `pyproject.toml` and lockfile.

### 14.3 Data and jobs

- PostgreSQL.
- pgvector.
- Redis.
- Celery workers.
- Transactional outbox and webhook inbox tables.

### 14.4 Storage and media

- S3-compatible object storage.
- Presigned direct upload.
- Server-side MIME, size, and checksum validation after upload.
- ffprobe metadata extraction.
- Thumbnail generation.
- Heavy transcoding is deferred; reject or manually flag unsupported media in early phases.

### 14.5 Infrastructure

- Docker and Docker Compose for development and first deployment.
- Nginx reverse proxy.
- HTTPS through a trusted certificate.
- Separate services: web, API, worker, scheduler, PostgreSQL, Redis; object storage external in production.
- GitHub Actions or equivalent CI.
- Structured JSON logs.
- Error tracking and health endpoints.
- Automated PostgreSQL backups and restore test.

---

## 15. Target repository tree

```text
temichev-media-hub/
├── AGENTS.md
├── apps/
│   ├── web/
│   │   ├── src/app/
│   │   │   ├── (marketing)/
│   │   │   ├── (auth)/
│   │   │   └── (cabinet)/app/
│   │   ├── src/features/
│   │   │   ├── auth/
│   │   │   ├── project-builder/
│   │   │   ├── rubric-builder/
│   │   │   ├── dynamic-forms/
│   │   │   ├── voice-recorder/
│   │   │   ├── content-studio/
│   │   │   ├── media/
│   │   │   ├── platform-preview/
│   │   │   ├── publications/
│   │   │   └── billing/
│   │   ├── src/components/
│   │   ├── src/generated-api/
│   │   ├── src/lib/
│   │   └── public/
│   └── telegram-intake-bot/
│
├── services/
│   ├── api/app/
│   │   ├── main.py
│   │   ├── core/
│   │   ├── db/
│   │   ├── api/v1/
│   │   └── modules/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── sessions/
│   │       ├── workspaces/
│   │       ├── memberships/
│   │       ├── projects/
│   │       ├── rubrics/
│   │       ├── schemas/
│   │       ├── rules/
│   │       ├── prompts/
│   │       ├── examples/
│   │       ├── content/
│   │       ├── revisions/
│   │       ├── media/
│   │       ├── ai/
│   │       ├── speech/
│   │       ├── embeddings/
│   │       ├── platform_accounts/
│   │       ├── destinations/
│   │       ├── publications/
│   │       ├── webhooks/
│   │       ├── billing/
│   │       ├── usage/
│   │       ├── audit/
│   │       └── notifications/
│   └── worker/
│       ├── celery_app.py
│       └── tasks/
│           ├── transcribe.py
│           ├── extract_facts.py
│           ├── embed_examples.py
│           ├── generate_master.py
│           ├── generate_variants.py
│           ├── process_media.py
│           ├── publish.py
│           ├── poll_status.py
│           └── cleanup.py
│
├── connectors/
│   ├── base/
│   ├── telegram/
│   ├── max/
│   ├── instagram/
│   ├── threads/
│   ├── youtube/
│   ├── website_webhook/
│   └── manual_export/
│
├── packages/
│   ├── ai-core/
│   │   ├── text-generation/
│   │   ├── speech-to-text/
│   │   ├── embeddings/
│   │   ├── retrieval/
│   │   └── evaluation/
│   ├── content-engine/
│   │   ├── assembler.py
│   │   ├── fact_locker.py
│   │   ├── variant_generator.py
│   │   └── character_counter.py
│   ├── schema-engine/
│   └── contracts/
│
├── presets/
│   └── projects/
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── policies/
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   └── backups/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   ├── connectors/
│   ├── e2e/
│   └── ai-regression/
├── docs/
│   ├── adr/
│   ├── exec-plans/
│   └── runbooks/
├── docker-compose.yml
├── pyproject.toml
├── pnpm-workspace.yaml
├── Makefile
└── README.md
```

---

## 16. Core data model

Primary groups:

### Identity

```text
users
sessions
email_verifications
password_resets
workspaces
memberships
```

### Project constructor

```text
projects
project_versions
rubrics
rubric_versions
input_schemas
project_rules
rule_versions
prompts
prompt_versions
templates
template_versions
```

### Examples and knowledge

```text
example_posts
example_metrics
example_embeddings
rejected_patterns
```

### Content

```text
content_items
content_blocks
content_revisions
locked_facts
platform_variants
media_assets
content_media
```

### AI

```text
provider_configs
generation_runs
generation_steps
ai_evaluations
model_usage
```

### Platforms and publication

```text
platforms
platform_accounts
project_destinations
platform_capabilities
publications
publication_attempts
external_posts
webhook_inbox
outbox_events
```

### Billing and operations

```text
plans
prices
entitlements
subscriptions
subscription_events
payments
invoices
usage_events
credit_ledger
audit_logs
notifications
feature_flags
```

Detailed relationships and required columns are specified in `DATA_MODEL.md`.

---

## 17. API boundaries

All application API routes are versioned under `/api/v1`. Key resources:

```text
/auth
/users
/workspaces
/memberships
/projects
/rubrics
/rules
/prompts
/examples
/content-items
/media
/ai-runs
/platform-accounts
/destinations
/publications
/billing
/usage
/webhooks
```

Frontend types are generated from the OpenAPI document. Do not maintain a separate handwritten duplicate of API DTOs.

Detailed endpoints are in `API_CONTRACT.md`.

---

## 18. “Что поесть? Армавир” preset

### 18.1 Active rubrics and editorial limits

| Rubric | Minimum | Maximum |
|---|---:|---:|
| Обзор недели | 3,500 | 4,100 |
| Фаст-обзор | 2,500 | 3,000 |
| Поесть до 500 ₽ | 3,000 | 3,500 |
| Что-то открылось | 2,500 | 3,500 |
| Гастропутешествие / Travel-обзор | 3,000 | 4,100 |
| Готовлю сам | 3,000 | 4,000 |
| Полуготовка | 2,500 | 3,000 |
| Рейтинги | none | 4,000 |

`Мимоходом` and `Прогрев` are not active rubrics and must not be seeded as active.

### 18.2 Platform application

- Telegram uses each rubric’s full editorial range; for 4,100-character rubrics, Rich Message mode is the primary path.
- MAX uses the same minimum where practical but clamps maximum to 4,000.
- Instagram has no inherited minimum; it uses an adapted caption with a hard maximum of 2,200.
- Threads later uses an adapted variant up to 500.

### 18.3 Ratings

AI suggests editable ratings on a 1–9 scale:

- General taste.
- Overall impression.
- Fatness (“толстых попок”).
- Spiciness (“горящих попок”).

Explicit user-provided ratings always override AI suggestions.

### 18.4 Initial example library

Import 50–100 strong Telegram posts selected by reactions, comments, shares, views, engagement rate, and manual quality review. The supplied “У Доника” post is a regression fixture and approved style example, not the only example.

---

## 19. Non-functional requirements

### 19.1 Performance

- Normal non-AI API p95 under 500 ms in the pilot environment.
- Large media must not pass through API process memory.
- AI, transcription, embedding, media processing, and publication are background jobs.
- UI provides job progress and can be resumed after reconnect.

### 19.2 Availability and recovery

- Health endpoints for web, API, worker, database, Redis, and external connector health.
- Daily encrypted database backup for the pilot; retention configurable.
- Documented restore procedure tested before public launch.
- Publication jobs recover after worker restart without duplicate posts.

### 19.3 Accessibility and mobile UX

- Mobile-first layouts.
- Keyboard and screen-reader accessible controls.
- Clear focus states and labels.
- Voice recorder does not rely on color alone.
- Platform validation errors identify the exact block and corrective action.

### 19.4 Localization

- UI translation infrastructure from the start.
- Russian is the first user-facing locale.
- English locale may be partial initially, but no Russian strings should be scattered through backend logic.

### 19.5 Server target

Personal pilot target:

- 4 vCPU.
- 8 GB RAM.
- 80–100 GB SSD for application, logs, and database.
- Media in external S3-compatible storage.

A 2 vCPU / 4 GB host may run a reduced personal pilot, but it should not perform local model inference or heavy video transcoding.

---

## 20. Initial scope and exclusions

### 20.1 Required for first usable personal release

- Landing, registration, login, account, workspace.
- Project/rubric constructor.
- “Что поесть? Армавир” preset import.
- Dynamic content studio with dictation and repeatable dishes.
- AI provider abstraction and at least one live text provider.
- At least one speech-to-text provider.
- Example import and retrieval.
- Master assembly, hook, ratings, CTA, fact validation.
- Telegram and MAX publication.
- Instagram prepared variant and connector readiness; live publication depends on account/API approvals.
- Publication history and retry.
- Billing/entitlement skeleton and mock payment.

### 20.2 Not required in the first usable release

- Automatic YouTube Community posts.
- Full YouTube video uploader.
- Threads live publication.
- Real recurring payment provider.
- Advanced analytics dashboards.
- Marketplace of templates.
- Local AI model hosting.
- Full media transcoding farm.
- Autonomous publication without human confirmation.

---

## 21. Definition of done

The product is not considered ready merely because pages render. A phase is done only when:

- Migrations apply from an empty database and upgrade from the previous phase.
- Seed/preset import is idempotent.
- Workspace authorization and entitlements are tested.
- API and frontend types agree.
- Required unit, integration, contract, and end-to-end tests pass.
- Error states and retries are visible.
- Secrets are absent from logs and bundles.
- Documentation and runbooks are updated.
- Acceptance criteria in `ACCEPTANCE_CRITERIA.md` pass.

The first real acceptance scenario is the “У Доника” Telegram publication fixture. It must produce one reviewed Telegram Rich Message containing 10 mixed media items and 4,069 characters, while MAX receives a valid version no longer than 4,000 characters and Instagram receives a separately adapted version no longer than 2,200 characters.
