# UI Phase 12I — Author Voice and Generated-Text Hygiene

## Status

Implemented, verified, and deployed to production on 2026-08-13. The idea generator stays disabled until its separate human quality gate passes.

## Goal

Make the product boundary explicit and enforceable:

`idea -> author dictates or types the substance -> AI edits -> author approves`.

An idea helps the user decide what to say. It is not source copy. The user's current words, confirmed imports, and locked facts remain the only authoritative substance of a publication.

## Product decisions

- “Nagovori” is a long-term editor for the author, not a substitute author or a generic chat.
- Accepting an idea stores a separate `ai_suggested` reference and opens voice/text capture. It does not prefill the author's transcript or revision body.
- Idea titles, angles, briefs, outlines, questions, and internal content titles are excluded from the master-generation prompt.
- Master assembly requires at least one non-empty author-originated source block before any provider call.
- An AI suggestion cannot be locked as a confirmed fact.
- Approved examples teach expression only: register, sentence rhythm, paragraph density, humor intensity, transitions, and broad vocabulary preferences. They do not provide topics, facts, scenarios, conclusions, quotations, or personal experience.
- Every generated publication text uses the same baseline hygiene rules. Project-specific rules may add constraints but cannot disable this baseline.
- Stored dictation, user-entered source text, imported examples, manual edits, rich text, code, URLs, and fixed boilerplate are never rewritten by the hygiene normalizer.

## Generated-text baseline

- Use ordinary single spaces; remove accidental tabs, separator non-breaking spaces, repeated horizontal whitespace, and line-edge whitespace.
- Allow no more than one blank line between real paragraphs and no empty lines at the beginning or end.
- Do not split connected prose into a sequence of very short one-sentence paragraphs.
- Do not emit literal doubled dash sequences (`--`, `––`, `——`) or paired parenthetical em-dashes such as `— aside —`.
- One grammatically necessary dash, line-leading dialogue, Markdown lists/tables/dividers, inline/fenced code, URLs, and email addresses remain valid.
- Lossless whitespace defects are normalized deterministically. Dash patterns or excessive paragraph fragmentation trigger one focused regeneration; a second invalid answer is blocked and is never persisted as ready.

## Scope

### Backend

- Add a generated-prose normalizer and validator that are separate from retrieval/hash normalization.
- Apply them to model-produced master text, body blocks, hooks, CTA, and platform refinement output before persistence.
- Add the author/editor and prose-hygiene contract to the shared system prompt and refinement requirements.
- Preserve exact paragraph structure from approved examples in prompt context while retaining normalized text for hashing and retrieval.
- Keep accepted idea data in its structured `ai_suggested` block and provenance, but write an empty acceptance revision body.
- Exclude all planning blocks and `title_internal` from master generation input.
- Reject idea-only master assembly with stable `author_source_required` before provider selection or invocation.
- Reject attempts to lock `ai_suggested` or `idea_brief` blocks.
- Reject transcription start and late transcription acceptance for planning blocks; sanitize legacy locks when cloning them.
- Treat only `user_text`, `voice`, `transcription`, and confirmed `import` blocks as author source; internal `system` blocks remain non-authoritative.
- Transfer notebook text into a separate author-source block without overwriting an accepted idea or its provenance.
- Make `lock=false` on an updated block remove any previous matching locked fact.

### Frontend

- Keep the selected idea visible as a reference beside the composer.
- Keep the transcript empty after selection and focus voice/text capture.
- Explain that the idea is a prompt for the author's words, not a generated draft.
- Continue disabling assembly until the author provides source text.

## Out of scope

- A standalone cross-project idea library or calendar.
- Fine-tuning a foundation model.
- Rewriting or “cleaning” stored dictation and manual edits.
- A complete configurable style passport; the owner will provide additional rules later.
- Replacing the MAX mechanical truncation path; it is recorded as a separate release risk.

## Migration and rollback

- No database migration or API response-schema change is required.
- Existing accepted idea blocks remain readable. New acceptance revisions have an empty text body and keep full structured provenance.
- Rollback is application-only. It restores the previous prompt and output handling without touching source text, accepted ideas, media, publications, PostgreSQL, or Redis.

## Acceptance checks

- Accepting an idea creates one `ai_suggested` reference, leaves the transcript empty, creates no locked fact, and does not place idea prose in the revision body.
- Idea-only assembly returns `422 author_source_required`; the provider is not called and no master revision is created.
- After voice or text input, assembly context contains the author's source and contains none of the idea title, angle, brief, outline, questions, or internal title.
- Attempts to lock an idea reference return a stable `422` response.
- Transcription cannot mutate an idea reference, a late accept remains blocked, and a cloned legacy idea reference is unlocked.
- A `system`-only item still returns `author_source_required` and its system text never enters the model prompt as author material.
- Reopening a draft never places a `system` or other non-author block into the transcript and never reuses that block as the editable author source.
- Notebook transfer preserves the idea reference, creates an import source, and then allows assembly.
- Changing a locked source to an unlocked AI suggestion leaves neither `is_locked` nor a stale `LockedFact` behind.
- Generated prose normalizes CRLF, tabs, separator non-breaking spaces, repeated spaces, trailing spaces, and three or more newlines; applying normalization twice is identical.
- URLs containing `--`, email addresses, inline/fenced code, Markdown divider/table lines, lists, and dialogue markers are preserved.
- Doubled dash sequences, paired parenthetical dashes, and excessive short-paragraph fragmentation are rejected with stable finding codes.
- One invalid generated answer receives one focused retry. A second invalid answer creates no new master/variant revision and preserves the last good result.
- Raw source and transcript bytes remain unchanged in storage.
- EN and RU product, AI-engine, API, acceptance, and execution-plan documents describe the same behavior.

## Verification

- `services/api/tests/test_editorial_surface.py`: 12 tests passed.
- Author-boundary, pipeline-hygiene, content-lock, transcription, and notebook targeted suites: 55 tests passed.
- `make lint`: passed.
- `make typecheck`: passed.
- `make test`: 135 tests passed.
- `make test-e2e`: passed.
- `make eval-content-ideas-validate`: passed without a provider call; fixture v1.2, 20 contexts, and 100 human-review rows were validated.
- `pnpm --filter @temichev/web build`: passed after the test run completed.
- `git diff --check`: passed.
- `make openapi` was not run because this slice changes neither the API response schema nor the migration head.

## Production release evidence

- Release `20260813-131201-phase12i-author-voice` deployed application commit `1ca4f0ba2b52f3a4bef9454e8d3551470e5d0bad` to `https://temichev-posthub.ru`.
- The Git archive was verified locally and on the server with SHA-256 `aef28ef28ce4746a1b3a7bdc92a5d283b92b7592bde27dab61ff0b83f21d51ea`; key source files inside the built API and Web images matched the local hashes.
- Fresh protected backup `/var/backups/media-hub/20260813-131201-phase12i-author-voice` contains a validated PostgreSQL custom dump, prior source/config/release snapshots, stateful identities, logs, health evidence, rollback image tags, the release archive, and checksums.
- Only API, worker, and Web were recreated with `--no-deps --no-build`. Their new container IDs begin `8c332afc`, `9d44bfc4`, and `9e90c0af`.
- PostgreSQL retained container `89eddc8c...` and named volume `media-hub_mediahub-postgres`; Redis retained container `038bcb78...` and named volume `media-hub_mediahub-redis`. Caddy was not reloaded and retained PID `7331`.
- Alembic remained `202606200012 (head)`. Control counts remained `13|13|11|17|58|26|5|7` for users, workspaces, projects, content items, revisions, media assets, notebook notes, and publications.
- `IDEA_GENERATOR_ENABLED=false` and the workspace allowlist remained empty in API and worker. The release therefore does not expose the failed-gate idea generator or permit a production provider call through it.
- Local and public live/ready checks passed; public home, login, and features returned successfully. API and Web started cleanly, and Celery connected to Redis and reported ready. The existing Celery root-user warning remains an infrastructure hardening item and did not block startup.

## Risks

- Russian prose can legitimately use one em-dash and dialogue markers. The validator protects those cases and does not automatically replace dashes.
- Markdown and URLs can legitimately contain repeated hyphens. Protected spans and structural lines are excluded from the dash rule.
- Paragraph-density thresholds can be too aggressive for poetry or deliberate microcopy. This baseline targets publication prose and uses conservative thresholds; later project rules can add, but not silently weaken, the global safety floor.
- A clean surface is not proof of human voice. Provenance boundaries, approved examples, final-edit feedback, and human approval remain necessary.
