# UI Phase 12E.1 — Atomic Notebook Dictation

## Status

Implemented and verified locally on 2026-08-02. Production remains unchanged.

## Goal

Make the notebook's primary voice action unambiguous and safe:

`tap “Надиктовать заметку” -> record -> finish -> transcribe with the configured STT provider -> create exactly one saved note`.

Text capture remains a separate action named `Сохранить идею`.

## Scope

- Rename the quick notebook voice action to `Надиктовать заметку`.
- Use explicit recording and processing states: `Закончить запись` and `Расшифровываю…`.
- Add one authenticated API operation that transcribes uploaded notebook audio and creates the note only after transcription succeeds.
- Preserve an optional typed draft by placing it before the accepted transcript in the same note.
- Keep the existing saved-note voice flow available for adding voice to an existing note.
- Record the accepted transcription, one usage event, and seven-day raw-audio retention using the existing tables and provider interface.
- Verify the Deep Forest notebook flow at 390 px and 1440 px.

## Out of scope

- Local Faster Whisper installation, a new STT provider, asynchronous transcription jobs, a database migration, publication automation, or production deployment.
- Changing the existing note, media, retention, or usage-event schemas.

## API contract

- `POST /api/v1/notebook/transcribe-new`
- Request: `workspace_id`, `media_id`, optional `body`, optional `kind`, `provider_key`, and test-only `mock_transcript` when the mock provider is selected.
- Response: the single newly created `NoteOut`.
- If media validation or transcription fails, no `NotebookNote`, `NotebookTranscription`, or usage event is created.
- Workspace membership and content-mutation role checks remain mandatory.

## Assumptions

- The browser uploads and completes a voice `MediaAsset` before calling the new operation.
- OpenAI remains the production STT provider for this slice; the existing NL proxy configuration is unchanged.
- A failed transcription may leave the uploaded media asset for the existing retention/cleanup process, but it must not leave an empty notebook note.

## Migrations

No database migration is required. Existing `notebook_notes`, `notebook_transcriptions`, `media_assets`, and `usage_events` tables are reused.

## Tests and verification

- API acceptance test: mock STT creates exactly one note, one accepted transcription, one usage event, and sets raw-audio retention.
- API failure test: provider failure creates no note, transcription, or usage event.
- API isolation test: media from another workspace is rejected without creating a note.
- Frontend checks for unsupported microphone APIs, empty recordings, disabled duplicate actions while processing, and the required Russian labels.
- `make openapi`, `make lint`, `make typecheck`, focused API tests, `make test`, production web build, visual smoke checks, `git diff --check`.
- In-app Browser inspection at 390 px and 1440 px with current screenshots and console/overflow checks.

## Risks

- Synchronous OpenAI transcription can keep the request open for several seconds. Mitigation: show a processing state and disable repeat submission until completion.
- A browser can stop a recorder without audio data. Mitigation: reject an empty blob before upload.
- Adding an API route can conflict with `/notebook/{note_id}` matching. Mitigation: declare the static `/notebook/transcribe-new` route before dynamic note routes and cover it with an acceptance test.

## Rollback

Revert this plan and translation, the new static notebook API operation, the focused tests/OpenAPI snapshot, and the quick-capture state changes. No data rollback is required.

## Production boundary

No production action is authorized by this plan. After local verification, provide the owner with the exact application-only deploy scope, backup, health checks, and rollback target and wait for separate confirmation.

## Completion notes

- Added the static atomic endpoint before the dynamic note routes; no migration was required.
- The quick card now shows `Надиктовать заметку`, `Закончить запись`, and `Расшифровываю…` and blocks duplicate actions while processing.
- Successful mock STT creates one note, one accepted transcription, one usage event, and seven-day raw-audio retention. Provider failure and foreign-workspace media create no note.
- OpenAPI, lint, typecheck, focused and full tests, E2E contract smoke, production web build, local migrations/seeds, API-backed in-app Browser checks at 390 and 1440 px, console/overflow checks, and `git diff --check` passed.
- The actual in-app microphone permission and external OpenAI response were not invoked during the browser audit. The existing OpenAI proxy suite passed; an owner-spoken smoke is reserved for the separately approved production deployment.
