# ADR 0013 — Publication Core, Outbox, And Connector Boundary

Date: 2026-06-20
Status: accepted, including production decisions approved by the owner on 2026-06-20

## Context

The product needs publication workflows before native social-network integrations are safe to enable. Canonical docs require immutable per-platform variants, destination-specific validation, human approval, durable publication intent, retryable attempts, idempotency, and visible partial success.

Phase 06 must also avoid native Telegram, MAX, and Instagram API calls. Those are separate connector phases.

## Decision

Represent publication as a durable backend workflow:

- `content_revisions` remain master revisions.
- `platform_variants` are immutable revisions derived from a master revision and scoped to a platform key.
- Editing a variant creates a new revision and supersedes the prior draft/approved revision.
- Only `approved` variants can be used to create a publication.
- `project_destinations` store manual-export and generic-webhook destinations in Phase 06.
- `publications` track one variant-to-destination publication intent.
- `outbox_events` are the source of truth for queued publication work.
- `publication_attempts` keep retry history and redacted connector evidence.
- `external_posts` record connector-visible results and enforce idempotency.
- `webhook_inbox` records received generic webhook callbacks for later connector/status work.

Use a connector capability registry in code for hard limits and validation:

- Telegram prepared variant: 32,768 characters, 50 media items.
- MAX prepared variant: 4,000 characters.
- Instagram prepared variant: 2,200 caption characters, carousel constraints recorded.
- Manual export: local package/payload generation only.
- Generic webhook: HTTPS-only target with private-network SSRF checks.

Use the following production outbox policy:

- PostgreSQL is the source of truth.
- A single Celery Beat instance polls every 2 seconds.
- Batch size is 100.
- Rows are claimed with `SELECT ... FOR UPDATE SKIP LOCKED`.
- Lease duration is 60 seconds.
- A watchdog reclaims expired leases every 60 seconds.
- Delivery semantics are at-least-once.
- All consumers and platform connectors must be idempotent.
- Retry cadence is 5 seconds, 30 seconds, 2 minutes, 10 minutes, 30 minutes, 2 hours, 6 hours, 12 hours.
- Respect `Retry-After`.
- After the final retry, move the event to `dead_letter`.

Use the following generic outbound webhook policy:

- Default mode is `simulate`.
- Staging mode is `allowlisted_live`.
- General live delivery may be enabled only after SSRF, DNS, egress, signing, verification, timeout, rate-limit, audit, and kill-switch controls are implemented and tested.
- Only owner/admin may activate a live webhook.

Use the following SSRF policy for live webhook delivery:

- HTTPS `POST` only.
- Port 443 only.
- Domain names only; IP literals are forbidden.
- Redirects are disabled.
- URLs containing userinfo are forbidden.
- Resolve and validate all A/AAAA records before every delivery attempt.
- Reject localhost, private, loopback, link-local, CGNAT, multicast, reserved, IPv6 ULA, and metadata addresses.
- Connect to the validated/pinned IP while preserving Host and TLS SNI.
- Connect timeout is 3 seconds.
- Total timeout is 10 seconds.
- Maximum request payload is 256 KB.
- Maximum stored response body is 64 KB.
- Sign requests with HMAC-SHA256.
- Require endpoint challenge verification.

Use the following production publication permission policy:

- Owner and admin may publish by default.
- Editor may create, edit, generate, preview, export, and submit for approval, but may not publish by default.
- Implement a granular `content.publish` permission so it can later be granted to an editor per project.

Use the following retention policy:

- Normalized publication snapshot: for the publication lifetime, plus 30 days after deletion.
- Raw provider request/response: 90 days.
- Publication attempts: 180 days.
- Webhook evidence: 180 days.
- Successful outbox events: 30 days.
- Failed/dead-letter outbox events: 180 days.
- Manual export package files: 30 days.
- Manual export metadata: 180 days.
- Audit logs: 365 days.
- Never store credentials, authorization headers, cookies, or webhook secrets in payload logs.

Use the following manual export policy:

- Keep status `manual_required` until explicit user confirmation.
- Downloading or copying a package does not mark it as published.
- On confirmation, set `status=published` and `publication_method=manual`.
- Store `confirmed_by` and `confirmed_at`, with optional `external_url`, `external_post_id`, and evidence.
- If the package expires, keep `manual_required` and allow regeneration.

## Alternatives Considered

- Use Redis/Celery as the primary queue state: rejected because Redis loss or restart must not lose a committed publication intent.
- Allow UI-only native connector configuration: rejected because new social networks need backend connector code.
- Let unapproved variants be queued: rejected because the initial product requires human confirmation.
- Use a single global character limit: rejected because platform hard limits and editorial targets differ.
- Perform real generic webhook HTTP delivery in tests: rejected to avoid flaky network behavior and accidental external calls.

## Consequences

- Publication can be audited and retried from database state.
- Native connector phases can attach to the same publication/outbox tables.
- The Phase 06 UI can show partial success and retry history without real social APIs.
- Generic webhook destinations are constrained from the start by SSRF validation.
- Production worker polling has approved timing, lease, retry, and dead-letter semantics, but Celery polling implementation still belongs to a later hardening slice.
- Generic webhook remains simulated by default; live outbound delivery requires the approved controls before activation.

## Migration And Rollback

The Phase 06 migration adds only publication-core tables. The production-decision follow-up migration adds manual confirmation fields to `publications`. Downgrade removes only these publication-core additions and does not touch users, workspaces, projects, content, media, examples, or AI runs.

## Evidence

The decision follows the Phase 06 plan, `docs/en/MASTER_SPEC.md` sections on platform variants/connectors/publication lifecycle, `docs/en/DATA_MODEL.md` publication tables, `docs/en/API_CONTRACT.md` publication endpoints, and the existing ADR 0004 transactional-outbox rule.
