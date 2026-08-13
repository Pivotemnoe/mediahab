# UI Phase 12H — Idea-to-Post Activation

## Status

Implemented, verified, and deployed on 2026-08-13 with the production feature disabled. The live 100-idea automatic run passed, but independent semantic review found zero-tolerance safety and originality violations, so owner-pilot enablement is blocked until a new prompt/model candidate passes the complete human gate.

## Goal

Keep the primary product path on one screen while helping a user who does not yet know what to publish:

`choose a channel -> ask for ideas -> choose one -> add personal details by voice or text -> prepare platform versions`.

The idea generator is a secondary entry inside `Создать`, not a new dashboard or technical AI screen. Model selection stays internal.

## Product decisions

- Show `Помоги придумать` beside the existing voice/text entry points.
- Generate five materially different ideas from the active project, optional rubric, optional user topic, and approved style examples.
- Each idea contains a title, a concrete angle, an `idea_brief`, a non-factual `starter_outline`, and three questions that invite personal facts or experience. The outline is structure, not a first-person story or a factual draft.
- Generating ideas creates no material. Explicitly accepting one idea idempotently creates exactly one content draft shell, stores a separate planning reference, and opens voice/text capture in the existing composer. The author source remains empty, the questions stay outside it, and existing text is never silently overwritten.
- Idea output is an editable starting point, not a factual source of truth or an automatic publication.
- Use the inexpensive auxiliary text model configured for this service. Per-workspace model routing is out of scope. Do not expose provider or model names in the product UI.
- Record project-level idea generation in the existing generation-run audit trail. Project-scoped runs may have no content item and no rubric.
- Keep the feature disabled by default, enable it only for an explicit workspace allowlist, and enforce server-side subscription, monthly entitlement, and daily-cap checks before any provider request.
- Reframe examples progress as `3 for a quick start` and `10 for a steadier style`; neither number blocks generation.
- Make it explicit that successful posts can be pasted from ChatGPT or any other lawful source the user controls.
- Keep the existing `final version -> remember style` feedback loop; improve its visible wording but do not redesign retrieval or add fine-tuning in this slice.

## Scope

### Backend

- Add an authenticated, CSRF-protected project idea-generation endpoint.
- Validate project and optional rubric ownership and workspace membership.
- Add a strict structured-output schema for exactly five ideas.
- Retrieve a bounded set of approved project/rubric examples for style only.
- Persist provider, model, request context, retrieved example IDs, latency, token usage, estimated cost, status, and response in `generation_runs`.
- Allow `generation_runs.rubric_id` and `generation_runs.content_item_id` to be nullable for project-level AI tasks.
- Add an authenticated acceptance endpoint. It receives `run_id`, `idea_id`, and a client-generated UUID `client_content_id`; in one transaction it creates or returns exactly one content draft for that tuple.
- Persist provenance from the accepted suggestion to the draft: `run_id`, `idea_id`, `client_content_id`, and the resulting `content_item_id` are recorded in the first structured content revision and the activation event. The revision text stays empty. The accepted outline remains a separate `ai_suggested` reference; it is not promoted to source text, master input, or a confirmed fact.
- Repeating the same acceptance request returns the same draft. Reusing one `client_content_id` for another run or idea returns a conflict and never overwrites content.
- Preserve safe provider errors; do not return mock marketing copy as if real AI generation succeeded.
- Route `suggest_content_ideas` through the auxiliary text model, independently from master/refinement models.
- Add operational controls with safe defaults: `IDEA_GENERATOR_ENABLED=false`, an empty workspace allowlist, and a configurable per-workspace daily cap whose initial pilot value is 20 completed or attempted provider runs per Moscow calendar day. An active subscription with a positive remaining `ai.text_generations.monthly` entitlement is also required. Disabled, non-allowlisted, inactive, unentitled, and over-cap requests do not call the provider.

### Frontend

- Add a responsive idea sheet/dialog to `SimpleVoiceComposer`.
- Allow an optional plain-language topic such as `хочу рассказать о...`; an empty topic asks the system to suggest from the channel context.
- Show five concise cards and one clear action `Взять идею`.
- The action generates `client_content_id`, accepts the selected idea once, and opens the returned draft in the current composer. If the composer already contains text, the user must explicitly create a separate draft or cancel; no append or replacement is implicit.
- Show the `idea_brief`, `starter_outline`, and three personal-detail questions beside the draft while keeping microphone/text entry immediately available.
- Show the entry point only when the backend reports the current workspace is enabled. Backend gating remains authoritative and cannot be bypassed by calling the endpoint directly.
- Preserve selected project, rubric, platforms, length, Instagram format, voice capture, media, draft restoration, and publication confirmation behavior.
- Update style/examples copy and progress to distinguish quick start at 3 from higher confidence at 10.
- Add the idea generator to the public feature description without claiming public anonymous generation.

## Out of scope

- Anonymous generation before registration. It requires a separate abuse-, quota-, consent-, and conversion-controlled phase.
- A standalone idea calendar, idea database, trends scraper, news search, competitor scraping, or automatic recurring generation.
- User-facing model names or raw provider selection.
- Foundation-model fine-tuning, a new embedding model, or retrieval-ranking redesign.
- A generated image, video, Reel asset, or automatic publication.
- A full style passport and model A/B dashboard. The new task type and stored runs create a clean later evaluation point.

## Migration and rollback

- Add one Alembic migration that makes `generation_runs.rubric_id` and `generation_runs.content_item_id` nullable.
- Downgrade is allowed only when no project-scoped runs with null foreign keys exist. The downgrade must fail clearly rather than discard audit rows.
- Application rollback may leave the nullable schema in place because it is backward compatible with existing content-item runs.
- Deploy the migration and application with the feature flag off. Disabling the flag is the first rollback action and must leave accepted drafts, AI audit rows, and existing composer flows intact.

## Acceptance checks

- `Помоги придумать` is visible on desktop and 390 px without displacing the primary microphone action.
- With the flag off or the workspace absent from the allowlist, the entry point is hidden and direct requests fail with a stable non-success response without calling the provider.
- The daily cap is enforced per workspace on the backend; the first over-cap request fails without a provider call and explains when the quota resets.
- The active subscription and monthly `ai.text_generations.monthly` entitlement are enforced in the same workspace-lock transaction. One idea run consumes one monthly event even when internal validation retries the provider; rejected requests consume nothing.
- Opening the idea sheet and generating ideas do not create a content item.
- A project with no rubric can receive exactly five ideas.
- Selecting a rubric confines rubric metadata and rubric examples to the request.
- Cross-workspace project or rubric identifiers return `404` without disclosing their existence.
- Each returned idea has a stable `idea_id`, non-empty title, angle, `idea_brief`, non-factual `starter_outline`, and exactly three non-empty detail questions.
- The outline contains no invented names, figures, prices, addresses, quotations, events, personal experience, or other concrete claims that were not supplied in the current request.
- Accepting an idea with one `client_content_id` creates exactly one draft shell with an empty author source and revision body; repeated clicks and network retries return the same `content_item_id`.
- Reusing that `client_content_id` with another run or idea returns a conflict and leaves the original draft unchanged.
- The first revision and activation event contain matching `run_id`, `idea_id`, `client_content_id`, and `content_item_id` provenance.
- Choosing an idea never silently destroys existing source text. The accepted outline remains visible as a reference but is excluded from the existing `assemble -> variants` input. The pipeline stays blocked until the user adds author-originated voice or text.
- Provider/model names and token prices are absent from the primary UI.
- Existing master generation, platform variants, voice capture, feedback, and project example imports keep passing.
- Style UI states clearly say `3 — quick start`, `10 — steadier style`, and do not block work.
- Desktop and 390 px layouts have no horizontal overflow; dialog focus, close action, loading status, errors, reduced motion, and keyboard use remain understandable.

## Activation measurement

Use durable backend evidence rather than client-only click counters. The measurable chain is:

`completed idea run -> accepted idea -> content draft -> first completed master -> first valid platform variant`.

- `generation_runs` is the source for requests, completion/failure, latency, model, tokens, and cost.
- The idempotent acceptance transaction records one activation event with `workspace_id`, `project_id`, `run_id`, `idea_id`, `client_content_id`, and `content_item_id`.
- Existing content revisions and platform variants provide downstream completion timestamps; no separate analytics database is required in this phase.
- Report idea-run success rate, acceptance rate, accepted-idea-to-valid-variant conversion within 24 hours, median time from idea request to first valid variant, average/p95 cost, and seven-day return to creation.
- Protect the primary product path with a guardrail: direct dictation-to-valid-variant conversion must not fall by more than 10 percentage points after the idea entry is introduced.
- Pilot success targets after at least 30 completed idea runs are: provider success at least 95%, acceptance rate at least 40%, at least 25% of completed runs reaching a valid platform variant within 24 hours, and median idea-to-valid-variant time no more than five minutes.

## Evaluation gate

Before production enablement, run a versioned frozen set of at least 20 representative project contexts. It must cover projects with and without rubrics, zero/three/ten approved examples, recent-title avoidance, an empty topic, a supplied topic, and sensitive domains such as a clinic where unsupported claims are especially risky.

- Generate exactly five ideas for every context, yielding at least 100 evaluated ideas per candidate prompt/model combination.
- Automated checks cover strict schema, five distinct `idea_id` values, exactly three questions, length limits, normalized duplicate detection inside a batch, near-copy detection against style examples, and overlap with recent project topics. Conservative lexical overlap indicators assist review but do not replace the human semantic verdict.
- Human blind scoring uses five dimensions from 1 to 5: project relevance, novelty, actionability, style fit, and factual safety. Every row also records material distinctness, unsupported facts, semantic overlap with a recent topic, and conversion of a style-example topic or motif into the idea itself.
- The gate passes only when every context returns a valid batch, at least four of five ideas in each batch are materially distinct, median relevance and actionability are at least 4, and all 100 ideas contain zero unsupported concrete facts, zero semantic recent-topic repeats, and zero copied example topics or motifs. These zero-tolerance checks cover title, angle, brief, outline, and detail questions.
- Changing the idea prompt or auxiliary model requires rerunning this gate; model names remain internal.

The executable gate is `tools/eval_content_ideas.py`. Its frozen v1.2 fixture contains the original user input, approved style examples, recent titles, explicitly provided facts, forbidden claim classes, one adversarial instruction embedded in an approved example, and one control context where a supplied name, date, price, and number are allowed. The runner imports the production idea prompt builders, strict schema, provider router, retry prompt contract, and response validator instead of maintaining a second prompt implementation. Raw evidence records every bounded attempt's prompt fingerprint and requires validation retries to use the exact same evaluated user prompt.

1. Run `make eval-content-ideas-validate` to check the 20-context fixture and the blank 100-row review template without a provider call.
2. Run `make eval-content-ideas`. It creates a timestamped directory below the ignored `output/content-idea-eval/` path containing `raw-results.json`, `summary.json`, and a copy of `human-review.csv`. Raw results include fixture context, model output, safe usage counters, latency, and validation findings; they never serialize API keys or authorization headers.
3. Blind-review all 100 ideas in the copied CSV. Score relevance, novelty, actionability, style fit, and factual safety from 1 to 5; mark material distinctness as `1` when distinct, and mark each violation flag (`unsupported_fact_0_1`, `recent_semantic_overlap_0_1`, `example_topic_copy_0_1`) as `1` only when present. The gate requires every violation flag to remain `0`.
4. Recalculate the gate with `make eval-content-ideas-gate EVAL_CONTENT_IDEAS_RAW_RESULTS=/absolute/path/raw-results.json EVAL_CONTENT_IDEAS_HUMAN_REVIEW=/absolute/path/human-review.csv`.

The live runner exits with code 3 while any human score is blank, even if every automatic check passes. A completed gate exits 0 only when all thresholds above pass; automatic or completed-human-review failures exit 2. Raw outputs may contain generated content and project-context fixture text, so they remain local artifacts and must be reviewed before any deliberate publication.

## Feature rollout

1. Apply the migration and deploy API/Web with `IDEA_GENERATOR_ENABLED=false`.
2. Run the full regression suite and the 20-context evaluation gate with no production workspace enabled.
3. Enable only the product owner's workspace in the allowlist, retain the daily cap of 20, and verify the complete provenance chain on real drafts without publishing automatically.
4. Collect at least 30 completed idea runs and review activation, safety, latency, error, and cost metrics.
5. Only after the pilot targets pass, add up to ten invited pilot users. Broader rollout is a separate decision; the global flag remains the immediate kill switch.

## Verification

- `make lint`
- `make typecheck`
- `make test`
- `make test-e2e`
- `make openapi`
- `pnpm --filter @temichev/web build`
- targeted API tests for idea generation, tenancy, schema, persistence, model routing, and retry behavior;
- targeted API tests for default-off gating, allowlist enforcement, subscription and monthly-entitlement enforcement, daily-cap boundaries, idempotent acceptance, conflicting `client_content_id`, provenance, project-scoped retry, and no provider call on rejected requests;
- targeted frontend contract test for idea-sheet copy, safe `idea_brief`/`starter_outline`, non-destructive selection, and reopening the accepted draft;
- `make eval-content-ideas-validate` without a provider call;
- `make eval-content-ideas`, followed by all 100 human scores and `make eval-content-ideas-gate ...`; the production feature flag stays off until that gate exits 0;
- in-app Browser checks of `/app/content/new`, `/app/style`, and a project examples page at desktop and 390 px;
- `git diff --check`.

## Verification result — 2026-08-13

- OpenAPI export, lint, strict type checking, 119 API tests, 5 repository tests, all UI contract checks, E2E smoke, the 34-page Next.js production build, both production Docker image builds, container import/Alembic-head checks, and `git diff --check` passed.
- The nullable migration reached `202606200012 (head)` on local PostgreSQL. Separate real-PostgreSQL concurrency acceptance proved both the daily cap (`202` plus `429`, one provider call) and monthly entitlement reservation (one reservation and one usage event under contention).
- Live model evaluation v10 returned valid structured batches for all 20 contexts and 100 ideas with the exact production prompt contract. Independent human review nevertheless blocked enablement because several ideas repeated recent topics, converted style-example motifs into topics, invented personal events or internal states, or left fewer than four materially distinct ideas in a batch.
- The global flag therefore remains off and the workspace allowlist remains empty. The code and backward-compatible migration may be released in this state; no production user can call the provider through the idea endpoint until a later candidate passes the human gate.
- Visual audit of the creation, style, examples, and notebook paths passed at desktop and 390 px. Automated browser checks did not grant a real device microphone permission; owner-device dictation remains a manual acceptance boundary.

## Production result — 2026-08-13

- Release `20260813-105705-phase12h-guarded-ideas` deployed commit `2e9ce49004630b2c6fa8c4eb7f428b30880560bb`. A web-only copy follow-up `20260813-112426-phase12h-copy-hotfix` corrected the pilot feature description found during live browser acceptance.
- The protected backup is `/var/backups/media-hub/20260813-105705-phase12h-guarded-ideas`; it contains the PostgreSQL custom dump, prior source/config snapshots, stateful identities, and rollback image tags. The release archive SHA-256 was verified before server-side builds.
- Alembic is at `202606200012 (head)`. `IDEA_GENERATOR_ENABLED=false`, the workspace allowlist is empty, and the daily limit/model defaults are explicit in production. The new endpoint therefore cannot call the provider for any production workspace.
- API, worker, and web run the release images. The compose cutover unexpectedly recreated the PostgreSQL container because `--force-recreate` propagated to its dependency; this was not required or intended. It reattached the same named volume, Redis and Caddy were not restarted, and no database restore was needed. Exact control counts remained `13/13/11/17/58/26/5/7` for users, workspaces, projects, content items, revisions, media assets, notebook notes, and publications.
- Public home, login, features, live health, and ready health returned HTTP 200. Caddy is active, API/worker/web started cleanly, the live landing rendered without console errors, and the corrected features copy was verified in the browser.

## Risks

- Generic ideas can feel like another ChatGPT. Mitigation: ground them in project/rubric context and successful-post style while requiring personal detail questions.
- An outline may be mistaken for verified facts. Mitigation: keep `idea_brief` and `starter_outline` structurally separate from confirmed source facts, ban unsupported specifics, preserve provenance, and keep fact questions visible.
- A selected idea may be lost or duplicated during a retry. Mitigation: accept it through one server transaction keyed by `client_content_id`, return the same draft for the same tuple, and test conflicts explicitly.
- An exposed generation endpoint can create unbounded spend. Mitigation: default-off server gating, workspace allowlist, subscription and monthly entitlement, daily cap, cost telemetry, and an immediate kill switch.
- Five long cards can overwhelm mobile. Mitigation: concise summaries, one card at a time visually, and detail disclosure only where useful.
- Project-level generation changes a mature audit table. Mitigation: nullable-only migration, explicit retry branching, tenancy tests, and a non-destructive downgrade guard.
