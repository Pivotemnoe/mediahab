# UI Phase 11A — Voice-to-Telegram Pilot

## Goal

Expose the already verified backend pilot path in the Russian user UI:

1. record or upload voice in Content Studio;
2. upload to S3 through presigned media;
3. transcribe with OpenAI STT;
4. store the transcript in the guided form;
5. assemble a master text;
6. generate and approve a Telegram variant;
7. publish to the configured test Telegram channel.

## Assumptions

- The current pilot deployment uses `https://temichev-posthub.ru`.
- Backend API, S3, OpenAI egress, and Telegram live publication were verified by smoke scripts.
- The first UI slice can target the active Content Studio item and the `atmosphere` field.
- The test Telegram destination is `@temichev_posthub_test`.
- Fixture mode must stay disabled/read-only for mutations.

## Implementation

- Add client-side browser recording/upload controls for Content Studio.
- Keep mutation and publication commands behind server actions where they need cookies/CSRF.
- Use direct browser PUT to the presigned S3 URL for media bytes.
- Revalidate the content page after successful STT/master/publication operations.
- Show concise Russian statuses for recording, upload, transcription, master assembly, and publication.

## Tests

- Typecheck and lint.
- Focused API/UI tests if touched contracts require it.
- Build web.
- Public visual/user smoke on `temichev-posthub.ru`:
  - create/open a real draft;
  - record/upload audio;
  - verify transcript appears;
  - assemble master;
  - publish to Telegram test channel.

## Risks

- Browser microphone permission and codec support vary. Provide file upload fallback.
- Telegram `sendRichMessage` accepts non-empty rich HTML, so empty master text must never be publishable.
- The current Telegram token was shared in chat and should be revoked after the pilot.
- OpenAI can paraphrase locked transcript facts during master assembly. If that happens, the pilot must not
  block Telegram testing: create a source-based fallback master and keep a visible quality warning.

## Rollback

- Revert the UI/client component and server actions.
- Keep backend smoke fixes in place unless a deployment regression appears.

## 2026-06-22 Follow-up: locked fact fallback

- Observed in production pilot: OpenAI rewrote a locked transcript about the Telegram test and the quality
  gate returned `fact_conflict`, leaving the UI unable to proceed to publication.
- Backend fix: when `assemble_master` detects locked fact conflicts, preserve the blocked quality errors in
  the generation step log, then build a master from the exact source blocks and locked facts. The completed
  run carries `ai_fact_conflict_fallback` in quality warnings.
- Test update: `test_locked_fact_conflict_uses_source_fallback_master_revision` verifies that a conflict no
  longer creates a dead-end and that the fallback preserves the locked `venue_name` fact.

## 2026-06-22 Follow-up: double publish UI hardening

- Observed in production pilot: two quick Telegram publication clicks created two successful publications.
  The dev overlay also showed a React duplicate-key warning because several Telegram variants were rendered
  with the same `platform` key.
- UI fix: platform previews now render one latest variant per platform and use the variant id as React key.
  The pilot publish and master buttons also use the `useActionState` pending flag together with transition
  pending state, so repeated clicks are blocked while the server action is in flight.
