# Phase 08 — MAX Connector

## Objective

Implement the MAX publication connector after Telegram: produce a validated MAX message payload, model media upload/readiness behavior, persist publication evidence, verify webhook callbacks, and keep all MAX-specific limits separate from Telegram and Instagram.

## Non-Goals

- Instagram, Threads, YouTube, or website native delivery.
- Final production webhook egress infrastructure.
- Claiming a universal MAX attachment-count limit before live evidence.
- Replacing the future production secret vault.
- Full dark Command Center UI.

## Current-State Findings

- Phase 06 publication core already persists variants, destinations, attempts, external posts, webhook inbox, and outbox events.
- Phase 07 added ordered media extraction and connector-specific payload rendering.
- MAX is still `max_prepared` with native delivery deferred.
- Existing webhook inbox can store MAX callback payloads and dedupe keys without a migration.
- Official MAX documentation checked on 2026-06-20 confirms:
  - `POST /messages` text is up to 4,000 characters and uses `Authorization: <token>` header.
  - `format` may be `markdown` or `html`.
  - `POST /uploads` returns upload URLs and media tokens; video/audio processing may return `attachment.not.ready` and should be retried.
  - `POST /subscriptions` requires HTTPS endpoint, recommends `secret`, and sends `X-Max-Bot-Api-Secret`.
  - `GET /chats` is no longer supported as of June 2026, so chat/channel IDs must be collected from events or configured manually.

## Assumptions And Open Questions

- The primary connector key becomes `max_message`.
- Without credentials, automated tests use `delivery_mode=simulate` and mark live mixed-media capability evidence as pending.
- A destination must provide `chat_id` because current MAX docs no longer provide chat listing.
- MAX media count remains `unknown_requires_live_spike`; tests must not encode a universal hard media-count limit.
- Media upload/readiness is represented as deterministic evidence in simulate mode and as a retryable connector error when `simulate_attachment_not_ready=true`.
- Webhook secret verification checks `X-Max-Bot-Api-Secret`; invalid signatures are recorded but rejected at the API boundary.

## Files And Modules

- Extend `services/api/app/modules/publications/connectors.py` with MAX capability, validation, formatting, upload attachment payloads, retryable not-ready handling, and optional live request boundary.
- Reuse `ordered_media_for_content` from `services/api/app/modules/publications/service.py`.
- Extend `services/api/app/api/v1/routes/publications.py` with `POST /webhooks/max/{destination_id}`.
- Add `services/api/tests/test_max_connector.py`.
- Update `/app/publications` technical copy for MAX.
- Update Phase 08 report, OpenAPI/spec artifacts, and open questions.

## Database Migration And Rollback

No migration is planned. Existing JSON fields store MAX request/response/evidence and webhook inbox rows. Rollback is a code rollback to `max_prepared`.

## Security And Tenancy Impact

- Owner/admin publishing policy remains unchanged.
- MAX token must never be sent in query parameters and must not appear in attempts, external-post payloads, webhook evidence, or API responses.
- Webhook endpoint requires HTTPS settings for subscription payloads and validates `X-Max-Bot-Api-Secret` when configured.
- Webhook dedupe uses the existing `webhook_inbox(destination_id, dedupe_key)` unique constraint.
- Connector retries rely on the existing outbox retry cadence and `retry_after_seconds` metadata.

## External API And Live-Test Prerequisites

- MAX bot token.
- Safe `chat_id` for a test channel/chat.
- Webhook HTTPS endpoint with trusted certificate and secret.
- Owner approval for a live 10 mixed-media spike.

Without these, live capability evidence stays pending.

## Implementation Order

1. Add this execution plan.
2. Implement MAX formatter and message payload builder.
3. Update MAX capability from prepared to `max_message`.
4. Add destination validation for `chat_id`, `format`, token/live mode, webhook URL/secret, and no query-token use.
5. Add simulated upload/readiness evidence and retryable `attachment.not.ready`.
6. Add MAX webhook route with secret verification and dedupe.
7. Add tests for 4,000-char clamp, auth redaction/header-only evidence, retryable not-ready, webhook secret/dedupe, and no media-count claim.
8. Update UI/report/spec artifacts.
9. Run focused and full verification.

## Tests And Commands

- `.venv/bin/python -m unittest services.api.tests.test_max_connector -v`
- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v`
- `make openapi`
- `make typecheck`
- `make lint`
- `make test`
- `make test-e2e`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- MAX variants never exceed 4,000 characters.
- MAX request evidence uses `Authorization` header metadata without token value and never query-token fields.
- `attachment.not.ready` creates a retryable publication state and outbox retry.
- Webhook with the wrong secret is rejected; duplicate delivery with the same dedupe key is not stored twice.
- Capability hard limits do not include an invented media-count maximum.

## Risks And Recovery

- Live MAX behavior for 10 mixed media may differ from local contract; store observed capability after the owner provides credentials.
- Chat discovery changed in current MAX docs, so project onboarding must collect `chat_id` from webhook events or manual admin input.
- If MAX upload/readiness semantics differ during live testing, keep simulate contract and adjust the live adapter without changing publication core tables.

## Status

- 2026-06-20: Started after Phase 07 Telegram commit and push.
- 2026-06-20: Backend contract, webhook route, tests, technical UI copy, OpenAPI artifacts, and full local verification completed.
