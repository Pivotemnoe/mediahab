# UI Phase 11C — Multi-Field Voice Pilot

## Goal

Extend the verified voice-to-Telegram pilot from a single `atmosphere` field to a minimal multi-field flow
that is still safe for production testing.

## Scope

- Let the user choose where the next voice transcript is saved:
  - `Атмосфера`
  - `Заведение`
  - `Адрес`
- Keep repeatable dishes out of this slice; they need a separate row-level voice UX.
- Keep Telegram publication as the final verification target.

## Assumptions

- This is still a technical pilot, not the final full-post editorial workflow.
- Saving several fields from the same page must fetch the latest content item version before each block write,
  because every mutation increments `ContentItem.version`.
- Accepted transcripts are locked facts, as in Phase 11A.

## Implementation

- Add a target-field selector to the `Голосовой пилот` panel.
- Save the uploaded voice media into the selected block instead of hardcoding `atmosphere`.
- Fetch the latest content item version immediately before the block `PUT`, avoiding stale-version conflicts
  when several fields are dictated in one session.
- Update Russian status text so the user sees which field was filled.

## Tests

- `make typecheck`
- `make lint`
- `make test`
- `pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`
- Production smoke: dictate or upload at least two fields from the same content page and verify no 409.

## Risks

- Short fields such as venue and address can receive noisy STT text. This is acceptable for the pilot because
  the textarea remains editable before acceptance.
- The master text is still a source-based test draft when facts are sparse; full editorial assembly is a later
  slice.

## Rollback

- Revert the selector and fresh-version fetch in the pilot component.
- Existing accepted field values remain ordinary content blocks and can be edited manually.
