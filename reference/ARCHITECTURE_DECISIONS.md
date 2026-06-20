# Baseline architecture decisions

These are baseline decisions for Codex to convert into numbered ADR files during Phase 00.

## AD-001 — Modular monolith first

Use a monorepo with a Next.js application, a FastAPI modular monolith, a Celery worker, connector packages, and shared contracts. Do not start with distributed microservices. This fits the personal pilot server, reduces operational cost, and preserves module boundaries for later extraction.

## AD-002 — Database-driven, versioned constructor

Projects, rubrics, dynamic fields, rules, prompts, examples, editorial limits, and platform assignments are database entities with immutable versions. The “Что поесть? Армавир” files are an importable preset, never application conditionals.

## AD-003 — Workspace is the tenant boundary

All tenant-owned data carries `workspace_id`. Authorization is enforced in application services from Phase 02. PostgreSQL Row-Level Security is added and tested before public SaaS launch as defense in depth.

## AD-004 — Server-side session security

Use email/password authentication with verified email, Argon2id password hashing, revocable sessions, Secure HttpOnly SameSite cookies, CSRF protection where applicable, and rate limiting. Do not put long-lived auth tokens in browser storage.

## AD-005 — Durable jobs use PostgreSQL outbox

PostgreSQL is the source of truth for publication intent. The transaction that creates a publication also creates an outbox event. Celery/Redis execute work, but worker loss or Redis visibility behavior must not lose the job. Each external publish call uses an idempotency key or an application-side duplicate guard.

## AD-006 — Direct-to-S3 media upload

The browser uploads large media through short-lived presigned URLs. FastAPI authorizes the upload and records metadata but does not proxy video bytes. Connector-specific public/signed delivery URLs are generated only for the required publication window.

## AD-007 — Provider families are separate

Text generation, transcription, and embeddings have separate interfaces, capability descriptors, configuration, fallback policies, usage logs, and health checks. OpenAI, Yandex, and GigaChat are not assumed feature-equivalent.

## AD-008 — Native connectors are code, destinations are configuration

A user can create manual-export or generic-webhook destinations through the UI. A native automatic social network requires a tested backend connector implementing the connector contract. The UI cannot manufacture OAuth, media upload, refresh, retry, and webhook behavior for an unknown API.

## AD-009 — Telegram Rich Message is primary for the real fixture

The primary Telegram path is `sendRichMessage`, validated against the supplied “У Доника” fixture: 4,069 characters and ten mixed media items in one visible channel publication. A split fallback exists but requires explicit approval.

## AD-010 — Human approval remains a release gate

AI may assemble, suggest, and adapt, but it does not publish autonomously in the initial product. Every payload is previewed and explicitly approved. Approved payload revisions are immutable.

## AD-011 — Editorial limits and technical limits are distinct

Project owners control editorial targets. Connector code owns technical hard limits derived from official policy. Validation is performed after final formatting and before queuing a publication.

## AD-012 — Billing is entitlement-driven

Plans expose entitlements such as project count, destinations, AI usage, transcription minutes, storage, team size, and automatic publishing. Backend services enforce entitlements. The initial payment provider is mock/manual; the data model permits later YooKassa, CloudPayments, or another provider adapter.
