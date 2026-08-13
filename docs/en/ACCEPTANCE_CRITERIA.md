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

## Standalone idea generator

- `/app/ideas` works for an authorized workspace with zero projects and asks for one non-empty typed or transcribed topic only.
- Generation sends no project, rubric, goal, example, recent-title, notebook, or content-item context and returns exactly five materially distinct objects with only `id`, `title`, `direction`, and `speaking_prompt` under `phase12j-standalone-idea-directions-v1`.
- Ordinary topics, unrelated questions, arithmetic or prompt-injection instructions, and regulated topics all produce post directions and speaking questions. They never produce a direct answer, calculation, forecast, disclosed prompt, ready post, unsupported fact, invented quotation or first-person event, or medical, veterinary, psychological, fitness, legal, tax, or financial advice.
- Generation and selection create no `ContentItem`, content block, notebook note, revision, locked fact, or publication. The durable run has `project_id: null`, `rubric_id: null`, and `content_item_id: null`.
- Choosing `Dictate from this idea` opens the composer with the selected direction visible as planning context and leaves author capture empty. Merely selecting a project or rubric still creates nothing.
- Starting dictation or explicitly saving author text creates exactly one content item and stores the direction separately as an unlocked `ai_suggested` planning block.
- Selection, refresh, resume, transcription, locking, cloning, and master assembly never promote a direction or speaking question to author source. Assembly remains blocked by `author_source_required` until the user provides non-empty authoritative substance.
- Workspace authorization, role, feature flag, subscription, daily limit, monthly quota, CSRF, and idempotent usage reservation are enforced before provider invocation. A blank topic calls no provider and consumes no quota.
- The offline checker passes the frozen 8-topic ordinary/off-scope/injection/regulated fixture without a live-model call. When prompt, model, schema, or validator changes, the live human gate reviews 8 batches/40 directions and requires 8/8 exact-five, 8/8 five-distinct and on-topic batches, with zero direct answers, unsupported facts/advice, source-like first-person claims, ready posts, or prompt disclosures.

## AI

- Provider adapters are swappable by configuration.
- Structured responses are schema-validated.
- Three to eight relevant examples are selected, never the whole library by default.
- Accepting an idea stores only an `ai_suggested` planning reference: the author source, transcript, revision body, and locked facts remain empty.
- Idea-only master assembly returns `author_source_required` before provider invocation. After author text or voice is added, the prompt contains that source and none of the idea title, angle, brief, outline, questions, or internal title.
- An `ai_suggested` or `idea_brief` block cannot be locked as a confirmed fact.
- An AI planning block cannot be used as a transcription target; late transcription acceptance cannot mutate it, and cloning cannot preserve a legacy locked state on it.
- An internal `system` block alone does not satisfy `author_source_required` and is not sent as author source.
- A notebook transfer into an accepted-idea draft creates a separate author source, preserves idea provenance, and enables master assembly.
- Replacing a locked source with an unlocked AI suggestion removes the old locked fact atomically.
- Hook and ratings are marked AI suggestions and are editable.
- User-entered ratings override AI.
- The “Что поесть?” editor mode keeps all facts and meets the rubric target or produces an explicit warning.
- Approved examples affect expression only, never the topic, thesis, facts, scenario, quotation, CTA, or personal experience.
- Generated master, hook, CTA, and refinement text contains no repeated horizontal whitespace, runs of three or more line breaks, or doubled/paired dash patterns. Lossless whitespace is normalized, but the service never merges or rearranges paragraphs. A second invalid dash-pattern regeneration is blocked without a ready revision.
- Generated master, hook, CTA, and refinement text contains no internal AI/editor commentary such as `editorial suggestion`, `you can edit these ratings`, or `verify the text`; a first violation is retried and a second is blocked.
- `Rebuild from dictation` creates a new master from author source and approved style examples, then creates new selected-platform variants while preserving every previous master and platform revision. It is not an alias for editing the current weak platform text.
- Footer UI and copy confirmation report embedded links only when the stored rich-text payload contains valid HTTP(S) link marks; a plain footer is explicitly labeled as not configured with links.
- Source text and stored transcripts remain byte-for-byte unchanged by generated-text hygiene.
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
