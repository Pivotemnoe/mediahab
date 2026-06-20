# Phase 07 — Telegram Connector

## Objective

Implement the first native publication connector: Telegram Rich Message delivery for long mixed-media channel posts, using the approved `fixtures/telegram-donika.json` regression fixture as the primary contract.

## Non-Goals

- MAX, Instagram, Threads, YouTube, or website native delivery.
- Telegram intake bot.
- Final Command Center dark operations UI.
- Silent fallback from Rich Message to media group plus text.
- Production-grade secret vault implementation beyond redaction and existing technical credential storage.

## Current-State Findings

- Phase 06 already has `platforms`, `platform_accounts`, `project_destinations`, `platform_capabilities`, `platform_variants`, `publications`, `publication_attempts`, `external_posts`, and `outbox_events`.
- Telegram is currently registered as `telegram_prepared` with native delivery deferred.
- Existing publication attempts and external posts can store Telegram request/response evidence in JSON without a schema migration.
- Existing media model has `media_assets` and `content_media.sort_order`, which is enough for ordered Telegram payload preparation.
- `fixtures/telegram-donika.json` contains the required 4,069-character text and 10 media expectation: 7 images and 3 videos.
- Official Telegram Bot API documentation checked on 2026-06-20 lists Bot API 10.1 Rich Messages, `sendRichMessage`, `InputRichMessage`, and `sendMediaGroup`.

## Assumptions And Open Questions

- Live publication remains pending until the owner provides a bot token and a safe test channel where the bot is an administrator with post/edit/delete permissions.
- The primary connector key becomes `telegram_rich_message`.
- Rich Message is represented internally as deterministic JSON blocks plus an HTML preview string containing `tg-collage`.
- Media delivery URLs are generated from the configured public S3 base URL plus storage key for contract tests; production signed download URLs can replace that helper later.
- Bot token and authorization fields must never appear in API responses, attempts, outbox payloads, or external-post payloads.
- Fallback to `sendMediaGroup` plus separate text is implemented as a prepared payload and can only run when destination configuration explicitly approves it.

## Files And Modules

- Extend `services/api/app/modules/publications/connectors.py` with Telegram capability, validation, rendering, destination validation, and simulated/live-pending publish behavior.
- Extend `services/api/app/modules/publications/service.py` with ordered media preparation and payload snapshot support.
- Add or extend API route responses only if existing `payload`, `validation`, `attempts`, and `external_posts` are insufficient.
- Add Phase 07 tests under `services/api/tests/test_telegram_connector.py`.
- Update OpenAPI, generated frontend API contract, execution report, open questions, and spec validation artifacts.
- Update `/app/publications` only if the existing technical shell cannot show Telegram mode/status clearly.

## Database Migration And Rollback

No database migration is planned for the first Phase 07 slice. Existing JSON fields store connector payload snapshots and evidence. Rollback is a code rollback to the Phase 06 `telegram_prepared` capability.

## Security And Tenancy Impact

- All account, destination, publication, and media access remains workspace-scoped.
- Only owner/admin can create non-manual publications under current production permission policy.
- Redaction must cover `bot_token`, `authorization`, `cookie`, `api_key`, `secret`, and Telegram-specific credential fields at every logging/response boundary.
- Telegram request payloads store `bot_token_ref` or redacted markers, never raw tokens.
- Publication retries remain idempotent through the existing publication/external-post idempotency key.

## External API And Live-Test Prerequisites

- Telegram bot token.
- Safe test channel ID or username.
- Bot admin rights with post, edit, and delete permissions.
- Owner approval for live Rich Message fixture test.
- Screenshot/evidence requirements for Telegram mobile/desktop clients.

Without these credentials, automated checks must mark the live acceptance criterion as pending rather than passed.

## Implementation Order

1. Add this Phase 07 execution plan.
2. Implement Telegram Rich Message renderer and deterministic payload builder.
3. Validate text/media hard limits, ordered media, HTTPS delivery URLs, destination channel, and fallback approval.
4. Switch Telegram capability from prepared/manual to native Rich Message primary mode.
5. Route publication processing through the Telegram renderer and simulated/live-pending connector result.
6. Add contract tests for the Donika fixture, rich payload shape, media ordering, idempotent retry, secret redaction, and fallback approval.
7. Update OpenAPI/spec artifacts and Russian report.
8. Run focused and full verification.

## Tests And Commands

- `.venv/bin/python -m unittest services.api.tests.test_telegram_connector -v`
- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v`
- `make openapi`
- `make typecheck`
- `make lint`
- `make test`
- `make test-e2e`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `fixtures/telegram-donika.json` validates as a single Telegram Rich Message with 4,069 characters and 10 ordered media items.
- Primary mode is `rich_message`, not a silent split.
- Generated payload includes a collage block, text block, method `sendRichMessage`, channel target, media order, and 24-hour delivery URL TTL metadata.
- Fallback payload requires explicit approval and stores multiple external IDs as one publication aggregate when used.
- Retry after success does not create duplicate external posts.
- Attempts and external-post evidence contain no raw credentials.
- Live credential absence is reported as pending.

## Risks And Recovery

- Telegram Rich Message API is new in Bot API 10.1, so live behavior may differ from the local contract until tested with the owner’s bot and channel.
- Public S3 URL generation is a contract placeholder; production signed download URLs must be verified with Timeweb S3 before live publication.
- If Rich Message is rejected by Telegram, fallback remains gated by explicit approval and can be disabled without losing publication history.

## Status

- 2026-06-20: Started after owner confirmation to continue with the product phases and the new UI package already reflected in the shell.
- 2026-06-20: Implemented Telegram Rich Message renderer, simulated/native dispatch boundary, ordered media payloads, fallback approval gate, and focused contract tests.
