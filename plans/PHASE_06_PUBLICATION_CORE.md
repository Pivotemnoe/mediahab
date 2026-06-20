# Phase 06 — Variants and publication core

## Objective

Create destination-specific variants and a durable, independent, observable publication pipeline before adding native connectors.

## Deliverables

- Immutable MasterRevision and PlatformVariant revisions.
- Connector capability registry and connector-owned hard limits.
- Platform preview, validation, approval, and edit-one-variant behavior.
- Publication, PublicationAttempt, ExternalPost, OutboxEvent, and WebhookInbox models.
- Transactional outbox dispatcher, Celery tasks, idempotency keys, retry/backoff, dead-letter state, cancellation, scheduling, and partial success.
- Manual-export connector and generic-webhook connector with signing and SSRF defenses.
- UI for queued/publishing/published/failed/manual-required states and manual retry.

## Non-goals

- Native Telegram/MAX/Instagram API calls.

## Acceptance

- Worker or Redis restart does not lose a database-committed publication intent.
- Retrying a successful simulated connector call does not create a duplicate.
- One destination may succeed while another fails; UI shows both correctly.
- Only an approved immutable variant can be queued.
- Generic webhook cannot target prohibited local/private network addresses.
