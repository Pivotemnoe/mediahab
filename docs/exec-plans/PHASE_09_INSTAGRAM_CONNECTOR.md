# Phase 09 — Instagram Connector

## Objective

Implement the Instagram connector contract without overstating production readiness: generate a compliant Instagram media/caption package, validate media and account prerequisites, expose actionable manual-required diagnostics, and keep live publication feature-flagged until Meta credentials, app review, scopes, quota access, and a safe test account are confirmed.

## Non-Goals

- Completing a real Meta OAuth app review flow without owner-provided app/account data.
- Claiming live Instagram publication is accepted.
- Implementing Threads, YouTube, website adapters, scheduling hardening, or Command Center operations.
- Storing real Meta credentials in plain configuration as a production secret-vault replacement.

## Current-State Findings

- Instagram currently uses `instagram_prepared`, `native_preferred=false`, and a 2,200-character variant limit.
- Phase 06 publication core already supports immutable variants, destinations, manual_required publications, attempts, external_posts, and idempotent retries.
- Phase 07/08 established connector-specific payload builders and contract tests for Telegram and MAX.
- Canonical spec requires Instagram professional account publication, 2,200-character captions, carousel 2-10 items, quota checks, two-phase container creation/status/publish, and manual_required when prerequisites block automation.
- Official Meta docs could not be fetched through browsing during implementation because the docs endpoint returned 429. Local canonical policy remains the source of record for this phase.

## Assumptions And Open Questions

- The connector key becomes `instagram_media`.
- Default delivery mode is `manual_required`; live delivery stays unavailable unless explicit readiness fields and owner credentials are supplied in a later phase.
- A destination may be created before Meta readiness is complete; missing account/app/scopes/review/quota data should produce `manual_required`, not a misleading connector failure.
- Media constraints are contract-level for MVP: single image, single video/Reel, and carousel 2-10 items. Detailed codec/duration/aspect validation remains a live-readiness task.
- Publication retry after `manual_required` must not create duplicate packages or duplicate external_posts.

## Files And Modules

- Extend `services/api/app/modules/publications/connectors.py` with Instagram capability, destination validation, hashtag/mention validation, media mode detection, Meta container-plan payload, and manual-required result.
- Reuse ordered content media from `services/api/app/modules/publications/service.py`.
- Add `services/api/tests/test_instagram_connector.py`.
- Update `/app/publications` technical copy.
- Update OpenAPI/spec artifacts only if public schemas/routes change.
- Update open questions and add this phase report.

## Database Migration And Rollback

No migration is planned. Existing JSON fields store Instagram package/evidence and external post metadata. Rollback is a code rollback to `instagram_prepared`.

## Security And Tenancy Impact

- Owner/admin publishing policy remains unchanged.
- Meta access tokens, auth headers, cookies, webhook secrets, and app secrets must be redacted from all configuration echoes, attempts, external_posts, and logs.
- Live publication remains feature-flagged; the local contract must not make network calls to Meta without an explicit later approval and verified credentials.

## External API And Live-Test Prerequisites

- Instagram professional account.
- Meta app ownership and OAuth redirect domain.
- Required scopes and app-review status.
- Test user/account availability.
- Quota endpoint access.
- Public HTTPS media delivery URLs with sufficient TTL.

Without these, the connector returns `manual_required` with diagnostics.

## Implementation Order

1. Add this execution plan.
2. Replace Instagram capability from prepared to `instagram_media` while keeping live automation disabled.
3. Add destination validation for delivery mode, readiness fields, public media URL base, caption format, and secret redaction.
4. Add caption, hashtag, mention, and media-count validation.
5. Build deterministic Instagram container-plan payloads for image, video/Reel, and carousel.
6. Return `manual_required` when external prerequisites are missing, with copy/download package details.
7. Add tests for long master adaptation, carousel limits, missing readiness diagnostics, secret redaction, and idempotent retry after manual_required.
8. Update technical UI copy, report, open questions, and validation artifacts.
9. Run focused and full verification.

## Tests And Commands

- `.venv/bin/python -m unittest services.api.tests.test_instagram_connector -v`
- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v`
- `make openapi`
- `make typecheck`
- `make lint`
- `make test`
- `make test-e2e`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- A 3,500-4,100-character master generates an Instagram variant no longer than 2,200 characters.
- Carousel validation rejects 0/1 and more than 10 items for carousel mode, and accepts 2-10 items.
- Missing Meta prerequisites return actionable `manual_required` diagnostics rather than `published` or opaque failure.
- Retry after a `manual_required` result does not duplicate external_posts.
- Attempts and API responses do not expose Meta tokens or app secrets.

## Risks And Recovery

- Official Meta API behavior may differ when credentials are supplied; record observed live capability before enabling live mode.
- OAuth/token lifecycle likely needs a dedicated integration module later; this phase only models readiness and publication contract.
- Detailed media codec/duration/aspect checks may need tightening after real account/media tests.

## Status

- 2026-06-20: Started after Phase 08 MAX commit and push.
- 2026-06-20: Connector contract, manual-required package, readiness diagnostics, tests, technical UI copy, and full local verification completed.
