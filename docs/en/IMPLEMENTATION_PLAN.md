# Implementation plan

Do not build the system in one Codex task. Each phase is a reviewable vertical increment with migrations, tests, documentation, and a runnable demo.

## Near-term priority — Quick Notebook and idea inbox

Implement the Notebook as one of the first user-facing slices after the simple voice-first creation flow is stable and before advanced automatic publication. Its purpose is to keep Media Hub useful between publication sessions: the user can capture an idea immediately without first choosing a project, rubric, platform, or full material workflow.

Deliver:

- An always-available Notebook entry in the authenticated app shell, plus a large, obvious Notebook action in the cabinet/dashboard on desktop and mobile.
- One-tap creation of a free-form note by typed text or voice dictation, with fast autosave and an honest saved/offline state.
- Notes that may represent a post idea, observation, task, link, rough draft, or unclassified thought; classification is optional and must not slow capture.
- Workspace and author scoping for every note, with timestamps, search, pin/archive, edit, copy, and delete/restore behavior.
- Actions to create a new `ContentItem` from a note or append the note to an existing material before or after dictation. Project selection is required only when converting to material; rubric selection remains optional.
- Non-destructive conversion: keep the original note, record the destination material, and prevent accidental duplicate imports.
- A compact recent-notes surface in the cabinet so unfinished ideas remain visible without overwhelming the primary creation flow.

Acceptance:

- A signed-in user can open the Notebook from any authenticated screen, capture and save a thought with text or voice, and return to the previous screen without losing work.
- A saved note can be copied, converted into a new material, or appended to an existing material with its source trace preserved.
- Notebook capture does not invoke AI, require a rubric, or publish anything automatically.
- Tenant isolation, Secure/HttpOnly session rules, voice/media retention, usage accounting, accessibility, and PWA recovery requirements apply to Notebook data and dictation.

Sequence this slice before advanced autopublication. Per-platform feedback and learned style may later use the final material produced from a note, but a raw private note is never treated as an approved style example automatically.

## Near-term roadmap — rich-text links and bounded content storage

This is roadmap scope only. Do not implement it inside Phase 12A.4 or change production until the owner approves a separate execution slice.

### Rich-text links in publication editing

- Replace plain-text-only editing for ready platform variants and reusable footers with one constrained rich-text editor that follows the familiar Telegram interaction: select any word or phrase, choose the link action, paste a URL, then edit or remove the link in place.
- Do not require users to maintain separate visible URL fields. Store a safe structured document with plain text plus validated link marks; never persist or publish arbitrary unsanitized HTML.
- Support rich clipboard output with `text/html` plus a `text/plain` fallback. Connector renderers convert the same structured links into the platform-supported Telegram/MAX HTML or Markdown representation.
- Keep source transcription plain by default. Rich links belong to the ready publication text and reusable footer, where the user expects formatting controls.
- Links added to an ordinary body belong to that immutable platform-variant revision. A full AI rebuild must preserve the old revision and must not silently attach links to different words in the new text. The reusable footer is reapplied deterministically with its links.
- Start with a deliberately small toolbar: link/unlink, bold, italic, undo, and redo. Do not turn the first slice into a general-purpose word processor.

### Proposed pilot retention policy

The owner direction to validate before cleanup jobs are enabled is:

- Uploaded photo originals, and future uploaded video originals, remain available for 30 days from upload by default. The product shows the expiry date on the material and warns before deletion.
- Evaluate an optional two-stage media lifecycle: original media for days 0–30, a compressed preview/archive for a short additional window only if storage and restore economics justify it, then permanent byte deletion. Metadata may remain so History can explain that the media expired; indefinite hidden archives are not allowed.
- Accepted transcripts, source text, master revisions, and platform text variants remain available for up to 180 days from the material's last meaningful edit or publication activity while the workspace is active.
- If the workspace has no authenticated activity for 90 days, notify the owner and start a 30-day recovery/export grace period. After that grace period, inactive material may be removed earlier than the active-workspace 180-day default. Returning, exporting, or explicitly retaining eligible text cancels the pending inactive cleanup.
- Raw voice retention remains a separate decision because accepted transcription usually removes the need to keep large audio. Choose its exact period before implementation rather than silently treating it as text.
- External posts already published to Telegram, MAX, VK, Instagram, or another platform are not deleted by Media Hub retention jobs. Deleting an external post remains a separate explicit connector action.
- AI diagnostic retention, publication/outbox evidence, audit logs, backups, and security records keep their separately documented operational periods; user-facing media cleanup must not corrupt idempotency or audit evidence.

Required product behavior before enabling deletion:

- Show a plain-language storage summary during upload and in material settings: what is stored, until when, and what will remain after expiry.
- Show storage usage and the exact upcoming deletion date; provide warnings at least seven days before destructive cleanup and again close to expiry where delivery is available.
- Offer export/download before deletion. Cleanup jobs must be workspace-scoped, idempotent, observable, and tested against object storage, database references, revisions, backups, and publication records.
- Use a recoverable deletion queue/grace state before permanent cleanup. Never make an expired image look like an application error; History shows an intentional `media expired` placeholder.
- Measure real photo/video storage, compression, egress, and restore cost before choosing whether the intermediate compressed archive is economically useful.

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
