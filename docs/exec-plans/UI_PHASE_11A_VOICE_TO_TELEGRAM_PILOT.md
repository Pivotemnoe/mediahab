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

## Rollback

- Revert the UI/client component and server actions.
- Keep backend smoke fixes in place unless a deployment regression appears.
