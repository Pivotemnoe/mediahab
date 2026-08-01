# UI Phase 12A - Simple Voice-First Multi-Platform MVP

## Status

Implemented and locally verified on 2026-07-29, including the signed-in live-API voice smoke. This document remains the canonical execution plan for the slice.

Implementation notes:

- Preserve the existing uncommitted Phase 11 UI work by keeping the redesigned dashboard at `/app/dashboard`.
- Render the simple voice-first composer at `/app` and `/app/content/new`.
- Create the content item lazily on the first real input so the microphone remains the first useful action.
- Persist ordered voice segments as one reviewed transcript in the selected rubric's first compatible source field; no migration is required.
- Add `vk` and `reels` as manual-export platform profiles only. They do not add or imply automatic connectors.
- Keep arbitrary free-form platform refinement honest: Phase 12A supports edit, copy, deterministic quick edits, and regeneration, but does not fake provider-backed refinement when no API contract exists.

Verification completed:

- Web production build, lint, and TypeScript checks passed.
- Full repository unit and integration test targets passed.
- Publication-core and AI-example integration tests passed.
- The new VK and Reels manual-export profiles passed focused tests.
- Specification validation passed: 69 checks, 569 files, 0 errors.
- E2E OpenAPI publication smoke passed.
- Browser visual and interaction smoke passed at 390, 768, 1440, and 1920 px with no horizontal overflow or console errors.
- Design QA passed; see `design-qa.md`.
- The signed-in live smoke passed with a real browser microphone recording, direct MinIO upload, OpenAI transcription, transcript correction and acceptance, one parallel assembly action, five ready platform tabs, and verified clipboard copy.
- Live smoke exposed and fixed two API-mode integration defects: duplicate `/api/v1` URL joining in server-side loaders and a PostgreSQL catalog initialization race during parallel variant generation.

## Product decision

The normal product must behave like a simple ChatGPT-style assistant with saved project, rubric, and platform rules.

The primary user action is not project administration, rubric building, publication diagnostics, or connector management. It is:

`select rubric -> dictate source material -> review transcript -> select platforms -> assemble -> review and copy variants`

Voice capture is the main input. Typed text and file upload are secondary options.

## User-visible product model

The interface exposes only four concepts:

1. Project - the overall voice, audience, and common rules.
2. Rubric - the type of post, its structure, required facts, and 3-5 approved example posts.
3. Source - one or more voice segments, with a merged editable transcript.
4. Platform version - a result for a selected social network.

The underlying backend may keep workspaces, content items, revisions, jobs, variants, and publication records, but normal users must not see those terms.

## Rules hierarchy

Generation uses small, explicit layers:

1. Project rules: voice, audience, forbidden phrases, common CTA preferences.
2. Rubric rules: purpose, required facts, structure, desired length, and 3-5 approved examples.
3. Platform profile: desired length, technical limit, formatting, hashtags, emoji, CTA, and output type.
4. Optional rubric-platform override: only when one rubric needs a special rule for one platform.

Rubric examples are saved once and reused for future materials. The user does not attach the same 3-5 examples to every new post. If a rubric has fewer than three approved examples, approved project-level examples may be used as fallback and the UI must show that fallback clearly.

## Platform selection and generation strategy

- Platform controls are multi-select checkboxes/chips with a `Select all` action.
- The user may select one platform or any combination.
- One `Assemble` action starts all selected outputs.
- Results appear incrementally in separate tabs/cards as each output is ready.
- Failure for one platform must not discard successful outputs for other platforms.
- Telegram, MAX, and VK may reuse one `long_post` result when their effective rules are identical and the text satisfies every selected limit.
- When their effective rules differ, adapters create separate results.
- Instagram is a separate caption profile.
- Reels is a separate short-video profile with at least `script` and `caption` outputs.
- VK and Reels are manual copy/export targets in this phase. Automatic publication requires a coded backend connector and is out of scope.

Implementation recommendation:

1. Create one rubric-controlled master draft from the accepted transcript.
2. Resolve effective rules for each selected platform.
3. Group platforms with identical effective rules and reuse output where safe.
4. Generate different groups independently, in parallel when provider limits allow.
5. Stream or poll status so completed platform tabs appear without waiting for every target.

The UI remains the same even if backend execution is queued or rate-limited.

## Primary screen states

### 1. New material

- Project selector.
- Rubric selector directly below it.
- Platform multi-select: Telegram, MAX, VK, Instagram, Reels.
- Large primary microphone control.
- `Pause`, `Continue`, `Finish segment`, and `Add more dictation` behavior.
- A chronological list of voice segments.
- A merged editable transcript.
- Secondary actions: paste text and attach audio/media.
- One primary button: `Assemble versions`.

The user may dictate the whole source in one segment or add several segments. New segments append to the same source in order. The user can correct the merged transcript before assembly.

### 2. Platform results

- Separate tabs/cards for every selected platform.
- Each result shows status, character count, target range, and technical limit.
- Main actions: `Copy`, `Edit`, `Shorter`, `More lively`, `Without emoji`, `Regenerate`.
- A short follow-up instruction field applies to the active platform only by default.
- An explicit `Apply to all selected versions` option is available but never assumed.
- Original transcript and rubric remain reachable without leaving the material.

### 3. Rubrics and rules

- Project settings contain a simple `Rubrics` section.
- Each rubric card shows name, purpose, desired structure, number of approved examples, and active platforms.
- Rubric edit form contains plain Russian labels, not schema or versioning terminology.
- Example management accepts 3-5 approved posts per rubric.
- Platform rules use simple fields: desired characters, formatting, emoji, hashtags, CTA, and prohibited patterns.
- Technical hard limits are shown separately from editable desired length and cannot be overridden beyond connector capability.

## Navigation

Normal PWA navigation contains only:

- `Create`
- `History`
- `Settings`

Project/rubric administration lives under Settings. Billing, team, connector diagnostics, outbox, retries, schema builders, raw prompts, and publication internals are removed from normal navigation. Existing advanced screens may remain available under an explicit advanced/admin route.

## Scope for Phase 12A

Implement one narrow vertical slice for an already configured project and rubric:

1. Replace the normal `/app` entry with the simple voice-first composer.
2. Load existing projects and rubrics from current services.
3. Allow selecting one rubric and multiple platform targets.
4. Reuse the existing voice upload/transcription/acceptance path.
5. Support multiple ordered voice segments and one merged editable transcript.
6. Reuse existing master assembly and platform variant endpoints.
7. Present selected variants in separate result tabs with copy/edit/regenerate actions.
8. Keep the existing advanced studio reachable only through `Advanced mode`.
9. Reduce normal navigation to Create, History, and Settings.
10. Keep all visible UI in Russian and mobile-first.

Phase 12A does not need a new rubric editor. It must consume existing rubric rules and examples correctly. The simplified rubric/example editor is Phase 12B after this vertical slice is verified.

## Explicitly out of scope

- Automatic publication to VK or Reels.
- Rebuilding connectors.
- Calendar, scheduling, billing, team management, or subscription redesign.
- New generic schema builders in the normal interface.
- Deleting backend tables or migrations.
- Rewriting the AI pipeline when existing contracts can support the flow.
- Hiding provider errors behind fake success states.

## Data and migrations

No migration is planned for Phase 12A.

Existing models already represent rubric-linked examples, content blocks, voice assets, transcription runs, master revisions, and platform variants. If implementation discovers a genuinely missing persistence field, stop and update this plan with a minimal additive migration before coding it.

## Acceptance scenarios

### Main voice flow

1. Open the PWA at 390 px width.
2. Select project `Что поесть? Армавир`.
3. Select an existing rubric.
4. Select Telegram, MAX, VK, Instagram, and Reels.
5. Record or upload three voice segments.
6. Confirm that segments remain in order and the merged transcript is editable.
7. Correct one sentence.
8. Press `Собрать версии` once.
9. Confirm that each selected platform receives its own visible tab or card.
10. Confirm that successful results remain available if another platform fails.
11. Confirm that character counts and effective limits are visible.
12. Copy one result without entering an advanced screen.

### Rubric context

1. Confirm that generation uses the selected rubric, not the project default by accident.
2. Confirm that approved examples linked to the selected rubric are preferred.
3. Confirm that project-level fallback examples are used only when rubric examples are insufficient.
4. Confirm that the UI identifies the selected rubric throughout the flow.

### Simplicity

- No normal-flow screen shows UUIDs, queues, outbox, retries, raw prompts, schemas, connector logs, fact-lock counters, or internal phase names.
- The first useful action is visible without scrolling at 390 px.
- A new user can reach recording in no more than two taps after opening the app.
- The primary flow has one final generation action, not a separate manual generation step per platform.
- No horizontal overflow at 390, 768, 1440, or 1920 px.

## Tests and verification

- Unit tests for effective rules hierarchy.
- Unit tests for rubric example preference and project fallback.
- Unit tests for platform grouping and safe output reuse.
- Unit tests for ordered voice segment merging.
- Integration test for one master plus multiple independent platform variants.
- Failure isolation test where one variant fails and others succeed.
- Existing API tests for transcription, assembly, and platform limits.
- Visual smoke at 390, 768, 1440, and 1920 px.
- Keyboard and focus-order smoke for recording controls, platform selection, result tabs, and copy actions.
- `make lint`
- `make typecheck`
- `make test`
- `make test-e2e`
- web production build
- `make validate-spec`
- `git diff --check`

## Risks

- Browser microphone permission and recording lifecycle may behave differently across iOS PWA, Android, and desktop. Keep audio file upload as a fallback.
- Generating five independent variants may increase cost and latency. Resolve effective rules and reuse identical long-post output when safe.
- Reusing one result across Telegram, MAX, and VK is valid only when every effective rule and limit matches.
- Hidden advanced functionality must remain reachable for support without leaking into the normal path.
- Existing uncommitted frontend work must be inspected and preserved before editing overlapping files.

## Rollback

- Keep the current advanced studio components and routes intact.
- Put the new simple composer behind a reversible route/view switch during Phase 12A.
- Roll back by restoring the old `/app` entry and navigation without touching content, voice assets, examples, variants, publication records, or database volumes.

## Next phase after acceptance

Phase 12B creates the simple Russian rubric/rules editor with 3-5 examples per rubric, project-level fallback examples, and optional rubric-platform overrides.
