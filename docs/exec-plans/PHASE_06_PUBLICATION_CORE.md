# Phase 06 — Publication Core

## Objective

Build the durable publication core before native social connectors: immutable platform variants, connector capabilities, validation and approval, project destinations, publication records, attempts, external-post records, webhook inbox, and PostgreSQL-backed outbox dispatch.

## Non-Goals

- Native Telegram, MAX, Instagram, Threads, YouTube, or website API publication.
- Final production UI design.
- Real external webhook delivery during automated tests.
- Background worker hardening beyond a database-backed dispatcher contract.
- Production credential encryption beyond redacted technical configuration stubs.

## Current-State Findings

- Phase 05 produces `content_revisions` and assigns `content_items.current_master_revision_id`.
- No platform-variant or publication tables exist yet.
- The frontend `/app/publications` screen is still a Russian technical placeholder.
- Worker infrastructure exists, but publication durability must be anchored in PostgreSQL outbox rows rather than Redis-only state.
- Connector capability documents exist in `platform-policies/`, and the canonical limits are defined in `docs/en/MASTER_SPEC.md`.

## Assumptions And Open Questions

- Phase 06 may create prepared `telegram`, `max`, and `instagram` variants, but it must not call native APIs.
- Manual export and generic webhook are the only connector implementations in this phase.
- Generic webhook delivery is simulated locally and stores redacted request/response evidence; live outbound HTTP is deferred.
- Generic webhook destinations must reject local/private network targets to establish the SSRF boundary.
- Scheduled publication is persisted and cancellable; real clock-driven worker polling can be attached later.
- Editors may create and approve technical publications in this slice using the same content mutation role set; final production publish permissions remain open.

## Files And Modules

- Extend `services/api/app/db/base.py` with platform, destination, variant, publication, attempt, external-post, webhook-inbox, and outbox models.
- Add Alembic revision `202606200006_phase06_publication_core.py`.
- Add `services/api/app/modules/publications` with connector capabilities, validation, variant generation, publication enqueueing, and dispatcher logic.
- Add `services/api/app/api/v1/routes/publications.py`.
- Include the publication router in `services/api/app/api/v1/router.py`.
- Add Phase 06 tests under `services/api/tests/test_publication_core.py`.
- Update `/app/publications` with a Russian technical shell.
- Update OpenAPI, e2e smoke checks, ADR index, open questions, and Russian report.

## Database Migration And Rollback

Upgrade creates:

- `platforms`
- `platform_accounts`
- `project_destinations`
- `platform_capabilities`
- `platform_variants`
- `publications`
- `publication_attempts`
- `external_posts`
- `webhook_inbox`
- `outbox_events`

Downgrade drops only these Phase 06 tables and leaves earlier content, AI, project, and auth data intact.

## Security And Tenancy Impact

- Every tenant-owned table includes `workspace_id`.
- Reads and mutations are scoped through workspace membership.
- Mutations require CSRF.
- Publication mutations use owner/admin/editor roles for the technical slice.
- Generic webhook secrets are never returned directly; only secret labels and redacted payload evidence are exposed.
- Generic webhook endpoints reject non-HTTPS URLs, loopback hosts, link-local ranges, RFC1918 private networks, multicast, unspecified addresses, and `.local` hosts.
- Publication retry uses idempotency keys and checks existing `external_posts` before creating new external-post records.

## Implementation Order

1. Add Phase 06 plan and ADR.
2. Add models and migration.
3. Add connector capability registry and manual/webhook connector stubs.
4. Implement variant generation, validation, immutable edit, and approval.
5. Implement project destinations and generic webhook SSRF validation.
6. Implement publication creation, scheduling, cancel, retry, attempts, external posts, and outbox dispatch.
7. Add Russian frontend technical publication page.
8. Generate OpenAPI and update smoke tests.
9. Run compile, lint, typecheck, unit, e2e, migrate, seed, spec validation, and diff checks.

## Acceptance Evidence

- Only approved immutable variants can be queued.
- Destination-specific variants respect connector hard limits.
- Manual export can succeed while generic webhook fails, and both statuses remain visible.
- Retrying an already successful publication does not create duplicate external posts.
- A committed outbox row remains the durable publication intent.
- Generic webhook cannot target local or private network addresses.
- Publication attempts show request/response/error history.

## Risks And Recovery

- The dispatcher is callable from API tests and can be moved behind Celery polling without changing DB contracts.
- Simulated generic webhook proves validation, retry, and idempotency but not real network behavior.
- Native connector-specific media preparation remains intentionally deferred.
- If Phase 06 migration must be rolled back, no Phase 01-05 data is removed.

## Status

- 2026-06-20: Started after owner confirmation to continue according to the specification.
