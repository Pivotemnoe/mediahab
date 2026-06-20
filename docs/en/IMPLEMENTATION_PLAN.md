# Implementation plan

Do not build the system in one Codex task. Each phase is a reviewable vertical increment with migrations, tests, documentation, and a runnable demo.

## Phase 00 — discovery, ADRs, and platform spikes

Goals:

- Confirm repository/toolchain decisions.
- Create ADRs.
- Build isolated payload/contract spikes for Telegram Rich Messages, MAX, and Instagram readiness.
- Record live-tested capabilities separately from documented capabilities.
- Finalize unresolved account/credential requirements.

No production feature development beyond scaffolding needed by the spikes.

## Phase 01 — monorepo and local platform

Deliver:

- pnpm monorepo and Python `uv` workspace conventions.
- Next.js app shell.
- FastAPI app and generated OpenAPI client pipeline.
- PostgreSQL, pgvector, Redis, Celery, MinIO for local development.
- Nginx/dev routing as appropriate.
- Make commands, CI, lint, typecheck, unit test baseline.
- Health endpoints and structured logging.

## Phase 02 — authentication, workspaces, and entitlement skeleton

Deliver:

- Registration, email verification adapter, login, sessions, reset flow.
- Workspace and owner membership.
- Secure cookies, CSRF, rate limiting.
- Plan/entitlement tables, Free seed, usage-event framework.
- Protected cabinet shell and public landing/pricing placeholders.

## Phase 03 — Project Builder and Rubric Builder

Deliver:

- CRUD and versioning for projects, rubrics, rules, prompts, templates.
- Dynamic JSON Schema form definitions.
- Project wizard and rubric drag/drop builder.
- Preset import/export and clone.
- Import the “Что поесть? Армавир” preset without hardcoding.
- AI rubric suggestion interface backed by a mock provider first.

## Phase 04 — Content Studio, media, and voice

Deliver:

- ContentItem, blocks, repeatable groups, autosave, revisions.
- Guided `Обзор недели` flow generated from preset schema.
- Direct S3 uploads, media ordering, metadata extraction.
- Voice recorder and transcription job abstraction with mock and one live provider.
- Fact correction and lock.

## Phase 05 — examples and AI editorial pipeline

Deliver:

- Manual/JSON/Telegram-export example import.
- Approval, dedupe, metrics, embeddings, retrieval.
- Text provider adapters for OpenAI, YandexGPT, GigaChat; at least one live.
- Structured fact extraction, master assembly, hook, ratings, CTA.
- Deterministic validators and AI quality check.
- AI run history, usage accounting, section-level regenerate.

## Phase 06 — variants and publication core

Deliver:

- PlatformVariant revisions and previews.
- Character counter strategies.
- Publication, attempts, outbox, worker idempotency, retries, schedule.
- Manual export and generic webhook connector.
- Partial-success UI.

## Phase 07 — Telegram connector

Deliver:

- Secure bot/channel connection.
- Rich Message HTML renderer and signed media URLs.
- Fallback renderer.
- Live acceptance of “У Доника” fixture where credentials allow.
- Edit/delete/status behavior.
- Connector contract and regression tests.

This phase may be moved earlier if Telegram is needed for the first internal demo, but publication durability must still be implemented first.

## Phase 08 — MAX connector

Deliver:

- Secure bot token and channel selection.
- Upload flow, media readiness retries, message publication, edit/delete.
- Webhook subscription and inbox.
- 4,000-character validator.
- Live test of the owner’s mixed 10-media case.

## Phase 09 — Instagram connector

Deliver:

- Meta OAuth, account selection, token lifecycle.
- Image, carousel, and Reel capability paths.
- Container polling, quota check, permalink capture.
- 2,200-character adaptation/validation.
- `manual_required` states and onboarding diagnostics.

If app review or account prerequisites are unavailable, ship a complete prepared/manual path and leave live publication feature-flagged.

## Phase 10 — scheduling, calendar, and hardening

Deliver:

- Calendar and timezone handling.
- Cancellation and rescheduling.
- RLS and expanded authorization tests.
- Backups, restore drill, monitoring, operational runbooks.
- PWA offline and update hardening.
- Performance and security tests.

## Phase 11 — billing UI and real provider preparation

Deliver:

- Pricing, subscription, usage, upgrade UI.
- Mock checkout and admin plan assignment.
- Payment provider interface, webhook inbox, tests.
- No real provider until commercial/legal settings are approved.

## Phase 12 — future connectors

Independent tasks:

- Threads.
- YouTube metadata/upload/comments/captions.
- Website dedicated connector.
- Telegram intake bot.
- Team collaboration enhancements.
- Analytics.

## Phase delivery report template

Codex must report:

1. Scope completed.
2. Files and migrations changed.
3. Commands run and exact results.
4. Screenshots or API evidence where relevant.
5. Live tests performed vs mocked/pending.
6. Security and data migration considerations.
7. Known limitations.
8. Next recommended phase/task.
