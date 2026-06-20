# Acceptance criteria

## Global

- A clean checkout starts with documented commands.
- Migrations build an empty database and upgrade from the previous release.
- No project/rubric/platform editorial policy is hardcoded in business logic.
- Cross-workspace access tests fail safely.
- Backend enforces entitlements.
- Frontend types are generated from OpenAPI.
- Secrets do not appear in logs, browser storage, or source.
- All automated checks pass.

## Project constructor

- An owner creates a new project entirely from the UI.
- The owner adds, reorders, edits, archives, and restores rubrics without code changes.
- A rubric can add a custom repeatable group.
- Character ranges are editable.
- Saving creates a new version; old content still renders with its historical version.
- The “Что поесть? Армавир” preset imports idempotently.

## Content Studio

- Selecting `Обзор недели` produces the configured sequence without asking the user for a hook or ratings.
- The user can add any reasonable number of dish blocks within configured schema constraints.
- Voice is uploaded directly to object storage, transcribed, corrected, and locked.
- Reloading does not lose a draft.
- AI cannot modify a locked venue, address, check, dish name, or price without a blocking error.

## AI

- Provider adapters are swappable by configuration.
- Structured responses are schema-validated.
- Three to eight relevant examples are selected, never the whole library by default.
- Hook and ratings are marked AI suggestions and are editable.
- User-entered ratings override AI.
- The “Что поесть?” editor mode keeps all facts and meets the rubric target or produces an explicit warning.
- Every run records provider, model, versions, usage, latency, and result.

## Telegram

Given the supplied fixture:

- Text count is 4,069 by the project editorial counter.
- Media count is 10: 7 photos and 3 videos.
- Validation selects Rich Message primary mode.
- Generated rich payload is within 32,768 characters and 50 media.
- A live test, when credentials exist, creates one visible channel publication with collage then text.
- Formatting and links render acceptably.
- External ID is stored.
- Retry does not create a duplicate.
- Fallback requires explicit approval and stores multiple external IDs as one aggregate.

## MAX

- Text above 4,000 is blocked or adapted before publication.
- Media upload readiness errors are retried.
- Auth token is never sent in query parameters.
- Webhook events are verified/deduplicated.
- A live mixed-media capability test is recorded as tested evidence, not assumed documentation.

## Instagram

- Telegram-length text generates a separate <=2,200-character variant.
- Carousel validation enforces 2–10 items.
- Current quota is checked before publish.
- Container status is polled before publish.
- Missing permissions produce actionable `manual_required` state.
- Publish retries do not duplicate an already-published container.

## Publication engine

- Telegram can succeed while Instagram fails.
- UI shows partial success.
- Worker restart does not lose or duplicate durable jobs.
- Scheduled jobs honor workspace timezone and can be cancelled.
- Retry history is visible.

## SaaS shell and billing

- Public landing, register, login, pricing, cabinet, account, and billing routes exist.
- User sees only own workspace data.
- Free-plan limit is enforced server-side.
- Mock payment never presents itself as a real completed payment in production.

## Operations

- Health/readiness endpoints work.
- Backup and restore instructions are executable.
- Staging cannot accidentally target production channels by default.
