# Phase 07 — Telegram connector

## Objective

Deliver the primary real publication path for long mixed-media Telegram channel posts.

## Deliverables

- Secure bot-token connection and channel selection/verification.
- Connector capabilities, Rich Message renderer, Telegram-safe rich HTML, signed media URLs, media ordering, and payload snapshots.
- `sendRichMessage` primary flow.
- Explicitly approved `sendMediaGroup` plus separate-text fallback.
- Publish, status persistence, edit/delete where supported by the selected payload mode, error mapping, and duplicate protection.
- Contract tests and a live acceptance script for `fixtures/telegram-donika.json`.

## Non-goals

- Telegram intake bot, unless separately approved.

## Acceptance

- Fixture count is 4,069 characters and media mix is 7 images/3 videos.
- The primary payload is one Rich Message, not a silently split publication.
- A live run, when credentials are supplied, stores returned external IDs and evidence; without credentials it is reported as pending, not passed.
- Retry does not duplicate the post.
- Fallback cannot run without explicit user approval.
