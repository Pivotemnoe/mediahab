# ADR 0013 — Publication Core, Outbox, And Connector Boundary

Date: 2026-06-20
Status: accepted for Phase 06 technical implementation

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
- Production worker polling and real network delivery still need hardening in later phases.

## Migration And Rollback

The Phase 06 migration adds only publication-core tables. Downgrade drops those tables and does not touch users, workspaces, projects, content, media, examples, or AI runs.

## Evidence

The decision follows the Phase 06 plan, `docs/en/MASTER_SPEC.md` sections on platform variants/connectors/publication lifecycle, `docs/en/DATA_MODEL.md` publication tables, `docs/en/API_CONTRACT.md` publication endpoints, and the existing ADR 0004 transactional-outbox rule.
