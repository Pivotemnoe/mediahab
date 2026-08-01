# UI Phase 12A.3 - Editorial Quality, Real Refinement, and Cost Visibility

## Status

Implemented, deployed, and verified in production on 2026-07-30.

## Production evidence

Release `20260730-1845-phase12a3-photo` was deployed to `temichev-posthub.ru` with the following checks:

- only the `api`, `worker`, and `web` containers were recreated; PostgreSQL, Redis, Docker volumes, Caddy, and neighboring services were left running;
- the database remained at Alembic revision `202606200008 (head)` and no migration was required;
- the production editor model is `gpt-5.6-terra`, helper tasks remain on `gpt-4.1-mini`, and the editor-model availability probe returned HTTP 200 through the configured NL relay;
- the authenticated production composer rendered the optional rubric, Telegram/MAX/VK/Instagram choices, the ten-photo section, the first-three-photo AI notice, and the editable four-rating guidance;
- production health returned ready, and the public landing, registration, and login routes returned HTTP 200;
- rollback artifacts are stored in `/var/www/media-hub-releases/previous-20260730-1845-phase12a3-photo`.

The latest real material in project `Что поесть? Армавир`, rubric `Фаст-обзор`, proved that the normal first assembly can produce a useful structured draft, but the refinement path is not production-safe yet:

- production text model: `gpt-4.1-mini`;
- transcription model: `gpt-4o-mini-transcribe`;
- embedding model: `text-embedding-3-small`;
- the accepted recording used 2,928 audio input tokens and 874 output tokens;
- the first AI chain retrieved the approved rubric example plus project-level fallback examples;
- the first master assembly completed and produced a 2,416-character structured post;
- a later `Regenerate` request timed out and the backend silently persisted a 3,009-character deterministic fallback assembled from the raw transcript;
- the fallback replaced the useful result in the simple composer without a clear provider-error state;
- `Shorter`, `More lively`, and `Without emoji` currently run local string transforms rather than an AI refinement;
- the free-form refinement input is displayed but is not submitted;
- the local `More lively` transform can corrupt punctuation, for example replacing the period in `ул.` with `!`;
- the simple composer offers Reels even though the owner wants the current normal flow limited to Telegram, MAX, VK, and Instagram.

## Objective

Make the normal path honest and useful:

`dictate -> assemble a strong master -> generate platform variants -> refine one variant without losing the last good result -> review cost and warnings`

## Product decisions

1. Keep `gpt-4.1-mini` for bounded extraction, hook, and rating helper tasks.
2. Use a separate stronger editorial model for master assembly and variant refinement. The initial candidate is `gpt-5.6-terra`, with low reasoning effort, because it is the current OpenAI balance tier rather than the highest-cost frontier tier.
3. Do not silently convert a provider failure into a successful user-visible regeneration.
4. A failed regeneration preserves the last good master and platform variant.
5. Quick actions are real AI refinements and create immutable variant revisions.
6. The free-form instruction has an explicit `Apply` action and defaults to the active platform only.
7. Reels is removed from the normal composer. Telegram, MAX, VK, and Instagram remain available.
8. Instagram remains a separately adapted manual-review result with the 2,200-character hard limit. No live Meta publication is implied.
9. A material may contain up to ten publication photos. The first three supported images are submitted once, at low detail, during fact extraction so receipt/menu/packaging evidence can help the editor without multiplying image cost across every AI step.
10. Image-derived prices and text remain unconfirmed suggestions until the user reviews them.
11. All four rating fields are always suggested from the full dictation and description. Explicit user ratings win; AI ratings remain editable suggestions with an explanation.

## Implementation

### Backend

- Add a separate `OPENAI_EDITOR_MODEL` setting while retaining `OPENAI_TEXT_MODEL` for helper tasks.
- Select the editor model for `assemble_master` and provider-backed refinement.
- Record an estimated micro-USD cost on generation runs from model and token usage.
- Add a provider-backed platform-variant refinement contract with:
  - active variant text;
  - source transcript;
  - project and rubric rules;
  - a small relevant approved-example set;
  - platform profile and hard limit;
  - one preset or free-form instruction;
  - structured JSON output.
- Persist a successful refinement through the existing immutable platform-variant revision service.
- Return an API error and create no replacement variant when the provider times out or returns invalid structured output.
- Keep deterministic fallback behavior for initial master recovery internally, but expose its warning and do not let a regeneration replace the last good result.
- Feed up to three JPEG/PNG/WebP attachments into the Responses API fact-extraction request as low-detail image inputs, then reuse the structured extraction in master assembly.
- Feed completed fact, hook, and rating helper results into master assembly instead of discarding them.

### Frontend

- Replace local string-transform quick actions with the refinement endpoint.
- Add presets:
  - `Shorter`;
  - `More lively`;
  - `More humor`;
  - `Without emoji`;
  - `Regenerate`.
- Add an explicit `Apply command` button for the free-form instruction.
- Show a loading state per active refinement and keep the current text visible.
- Show provider/fallback warnings in the results card.
- Remove Reels from the normal platform selector.
- Keep Instagram selectable and independently visible.
- Add a short dictation guide near the transcript: venue/address, dish, price/weight, atmosphere, packaging, taste, repeat intent, and optional ratings.
- Add a dedicated photo section with a ten-photo publication limit, an 8 MB per-photo browser guard, supported-format guidance, and an explicit note that the first three photos inform AI assembly.
- Explain that AI proposes the four ratings and the user may correct them.

### Cost visibility

- Calculate and store text-generation cost when token usage is available.
- Preserve transcription token usage from the OpenAI response.
- Add audit tests for known model prices and unknown-model behavior.
- Do not claim exact organization billing parity: provider invoices remain authoritative, especially for timed-out requests whose usage response was not received.

## Data and migrations

No database migration is planned. `generation_runs.cost_estimate_micro_usd`, token fields, immutable platform variants, transcription confidence metadata, and usage-event tables already exist.

## Acceptance scenarios

1. The first master assembly uses the editor model and returns a structured post.
2. `More lively` creates a new AI-backed variant revision and does not corrupt abbreviations.
3. `More humor` adds contextual humor without inventing facts.
4. A free-form command is actually submitted and affects only the active platform by default.
5. `Apply to all` refines each selected platform independently.
6. A provider timeout leaves the last good variant visible and returns a clear Russian error.
7. Reels is absent from the normal composer.
8. Telegram, MAX, VK, and Instagram can be selected.
9. Instagram output is independently adapted and no longer than 2,200 characters.
10. Generation runs record model, tokens, latency, status, and estimated cost when pricing is known.
11. The photo section accepts up to ten JPEG/PNG/WebP files and clearly reports upload progress.
12. At most three attached photos are submitted to one multimodal fact-extraction call at low detail; image payloads are not persisted in run metadata.
13. Master assembly receives the completed helper outputs, and all four ratings have values from the user or an explicitly marked AI suggestion.

## Tests

- API unit tests for model routing and cost estimation.
- API integration tests for successful refinement, immutable revision creation, workspace authorization, validation, and provider failure.
- Existing transcription, AI example, publication, and platform-limit tests.
- Web lint and TypeScript checks.
- Production web build.
- Browser smoke for quick actions, free-form command, Instagram selection, and failure preservation.
- `make lint`
- `make typecheck`
- `make test`
- `make test-e2e`
- `make validate-spec`
- `git diff --check`

## Risks

- Stronger models cost more; helper tasks must not automatically move to the editor model.
- Repeating large project/rubric instructions and all examples increases latency and cost. Keep retrieval small and remove duplicated examples without dropping rubric priority.
- A timed-out provider request may still be billed even if the application never receives usage metadata.
- Image token cost depends on model, resolution, detail mode, and crop. Future receipt economics must be measured on real samples rather than promised as a fixed per-photo price.
- Image transfer uses bounded base64 data URLs through the existing NL relay; only count and detail metadata are audited, never image bytes.

## Rollback

- Restore `OPENAI_EDITOR_MODEL` to `gpt-4.1-mini`.
- Revert the refinement endpoint and frontend controls while preserving all existing variant revisions.
- Restore the Reels selector only if product scope changes.
- Remove multimodal inputs and the photo UI while retaining already-uploaded media assets and publication attachments.
- No PostgreSQL, Redis, object-storage, Docker-volume, Caddy, or neighboring-service rollback is required.
