# UI Phase 12C.2 - Quick Notebook

## Status

Implemented and accepted locally on 2026-08-01. Production remains unchanged until the owner separately confirms deployment.

## Goal

Add a workspace-scoped idea inbox that is always reachable from the authenticated shell. A user can type or dictate a note without selecting a project, rubric, or platform, then non-destructively copy or transfer it into the existing simple voice-first material flow.

## Assumptions and decisions

1. A notebook note is its own tenant-owned record, not a hidden `ContentItem`.
2. Capture never invokes text generation, publication, or project/rubric selection.
3. Every note is scoped by `workspace_id` and `author_id`; workspace members may read, but only owner/admin/editor roles may mutate.
4. The note body is plain text. Optional kind values are `idea`, `observation`, `task`, `link`, `draft`, and `other`.
5. Autosave uses optimistic `version` checks and exposes saving/saved/offline/error states. The browser keeps the latest unsaved body in workspace-scoped local storage for PWA recovery.
6. Soft delete is restorable. Archive and pin are reversible.
7. Voice uses the existing presigned object-storage upload and STT provider. A separate notebook transcription row records provider evidence without creating content blocks. Accepted notebook audio receives a provisional 7-day `retention_until`; the exact general raw-voice policy remains an open product decision and this slice does not run deletion.
8. Converting to a new material requires a project and accepts an optional rubric. Appending requires an existing material in the same workspace.
9. Transfer writes to the material's current source field, appending with a visible separator when text already exists. A unique transfer key prevents the same note version from being imported twice into the same destination.
10. The original note and transfer trace remain after conversion. Raw private notes never become approved style examples automatically.

## Data and migration

- Add `notebook_notes` with workspace/author scope, body, optional kind, pin/archive/delete timestamps, optimistic version, and audit timestamps.
- Add `notebook_transcriptions` linked to note and media asset with provider status, transcript/correction, acceptance, and usage evidence.
- Add `notebook_transfers` linked to note and destination `ContentItem`, transfer kind, note version, destination block, and actor. Enforce one transfer per note version/destination/kind.
- No existing table is destructively changed.

## API and frontend

- CRUD/list/search/restore endpoints under `/api/v1/notebook`.
- Voice transcribe/accept endpoints reuse existing media authorization and provider code.
- Transfer endpoints create or append to a `ContentItem`, preserving project/rubric rules and revisions.
- Add `/app/notebook`, topbar/mobile navigation entry, dashboard action, and recent-notes card.
- The route stays compact and mobile-first; capture is first, organization and transfer are secondary.

## Tests and acceptance

- Tenant and role isolation, optimistic conflict, search/pin/archive/delete/restore.
- Voice provider mock flow, notebook transcription acceptance, retention timestamp, and usage event.
- Create-material and append transfer preserve the note, record trace, keep rubric optional, and reject duplicate imports.
- Browser acceptance at 390 px and 1440 px: immediate capture, autosave state, navigation, copy, restore, and transfer into the existing composer.
- Full lint, typecheck, API tests, OpenAPI regeneration, production web build, and relevant end-to-end tests.

## Risks

- Browser offline recovery can conflict with a newer server version; never overwrite silently after a 409.
- STT or object storage may be temporarily unavailable; typed notes remain fully usable and audio stays visibly pending/error.
- Appending to a generated material must not mutate platform variants silently; it only updates the source block and requires an explicit rebuild by the user.

## Rollback

- Revert notebook route/components/API/module/model additions and migration `202606200009`.
- The migration downgrade removes only notebook-owned tables and indexes. Existing projects, materials, media, revisions, publications, outbox, and production connector state remain untouched.

## Verification result

- `make lint`, `make typecheck`, `make openapi`, the focused notebook suite, and the full `make test` suite pass.
- API acceptance covers workspace isolation, optimistic conflicts, search, pin, soft delete/restore, mock STT acceptance, usage accounting, short raw-audio retention, non-destructive create/append transfers, and duplicate prevention.
- A real local API-backed browser flow registered a user, saved and autosaved a note, created a project, transferred the note once, and reopened the same `ContentItem` in the existing editor with the source text present.
- At 390 px and 1440 px the Notebook navigation and transfer controls remained available and document `scrollWidth` equalled `clientWidth`.
- Browser acceptance exposed an initial wrong `resume` query parameter. It was corrected to the existing `edit` resume contract and covered by the API test.
