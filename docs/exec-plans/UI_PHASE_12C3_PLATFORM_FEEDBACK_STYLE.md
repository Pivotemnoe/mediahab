# UI Phase 12C.3 - Per-platform Feedback and Learned Style

## Status

Implemented and accepted locally on 2026-08-01. Production remains unchanged until separately approved by the owner.

## Goal

Let the user evaluate each Telegram, MAX, VK, and Instagram variant independently and reversibly. Use only an explicitly excellent, final user-edited variant as an internal project/platform style example. This does not train OpenAI or any provider model and never publishes automatically.

## Decisions

1. Feedback belongs to one immutable `PlatformVariant`, one workspace, one actor, and therefore one platform.
2. Reactions are `excellent`, `good`, `needs_work`, and `not_my_style`; an optional short comment may explain the choice.
3. The actor can replace or revoke feedback. The latest active reaction is shown when the material is reopened.
4. Only `excellent` feedback with explicit `learn_style=true` may create a learned style example.
5. Style learning is accepted only when the variant was created by a manual edit. An untouched AI variant, raw Notebook note, source transcription, or rejected version is never learned automatically.
6. The learned snapshot is the exact final text of that immutable variant, scoped to workspace/project/rubric/platform. Later edits create a new variant and need a new explicit reaction.
7. Learned samples reuse the approved-example retrieval pipeline with `source_type=variant_feedback` and a platform label. Master generation excludes these platform-specific samples; matching platform refinement may retrieve them.
8. Replacing/revoking an excellent reaction deactivates only the feedback-owned example. Manually imported examples are never modified.
9. Reactions do not approve or publish a post. Publication keeps its existing separate human-confirmation gate.

## Data and migration

- Add `platform_variant_feedback` with workspace, project, platform, variant, actor, reaction, comment, optional owned style-example link, active/revoked timestamps, and optimistic version.
- Unique active state is represented by one row per actor/variant; updates are reversible and auditable.
- Mark manual-edit variant payloads with `source=manual_edit` and `edited_by`.

## API and UI

- GET/PUT/DELETE feedback endpoints per platform variant.
- Return the current actor's feedback with variant responses where practical.
- Add compact reaction controls to each ready platform version in the simple composer and saved-material view.
- Explain that only “Отлично · запомнить стиль” records an internal example and does not train OpenAI.

## Tests

- Workspace and role isolation; platform independence; replace/revoke behavior.
- Reject style learning from untouched AI output.
- Learn exact final manual-edit text and scope it to the same project/platform.
- Deactivate feedback-owned example on reaction replacement/revocation without touching manual examples.
- Retrieval excludes platform feedback from the master and includes only matching platform feedback for refinement.
- Mobile 390 px and desktop 1440 px controls remain visible without horizontal overflow.

## Risks and rollback

- Too few explicit excellent samples produce no useful learning; the UI must not imply immediate model training.
- Positive samples can overfit repeated phrasing. Retrieval remains bounded, reversible, project/platform scoped, and subordinate to facts/rules.
- Rollback removes the feedback table, endpoints, controls, manual-edit marker, and platform retrieval branch. Existing variants and manually imported examples remain untouched.

## Verification result

- Focused API acceptance proves independent Telegram/MAX reactions, replacement/revocation, exact manual-final-text learning, and rejection of untouched AI output.
- Matching platform refinement retrieves only its platform feedback example; master generation and other platforms exclude it.
- The feedback-owned example is approved without a provider embedding call, so saving a reaction neither trains OpenAI nor consumes OpenAI tokens and remains available during provider outages.
- Real local API-backed browser acceptance persisted Telegram `excellent + learn_style` and an independent MAX `needs_work`, then reopened both controls in saved History.
- Controls remained visible at 390 px and 1440 px with `scrollWidth == clientWidth`.
- `make lint`, `make typecheck`, `make openapi`, the focused suite, and the full 94-test suite passed before Phase 12C.4; the combined post-retention suite passes 97 tests.
