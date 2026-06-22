# UI Phase 11E — Full Telegram Draft Pilot

## Goal

Make the pilot path produce a review-ready Telegram draft, not only a raw dictation or a single status message.

## Scope

- Add one guided action in `Голосовой пилот` that prepares a full Telegram draft.
- Reuse existing backend pipeline steps:
  - `extract-facts`
  - `suggest-ratings`
  - `suggest-hook`
  - `assemble-master`
  - `generate-variants` for Telegram
  - `validate` Telegram variant
- Show a concise Russian status with:
  - master text length;
  - Telegram text length;
  - reference examples used;
  - first hook;
  - validation/warning count.
- Extend the pilot voice target selector with `Итоговое впечатление`.

## Assumptions

- The existing examples imported into the project are approved and embedded; the backend retrieval step decides which ones are relevant.
- Full repeatable dish capture can still use the existing guided form/manual controls in this slice.
- This slice prepares and validates the Telegram variant, but keeps final publication behind the existing explicit publish button.

## Implementation

- Add `prepareFullTelegramDraftAction` server action in `content-actions.ts`.
- Compose existing API calls without creating a new backend endpoint.
- Keep all user-facing UI text in Russian.
- Keep fixture mode disabled.

## Tests

- `make typecheck`
- `make lint`
- `make test`
- web build
- `make validate-spec`
- `git diff --check`
- Production smoke: open a real content item and verify the new button is present.

## Risks

- If required facts are still missing, the generated master can be technically valid but weak. The status should expose warnings rather than pretending the draft is final.
- If there are no approved examples, the reference count can be zero; this is visible feedback for the next examples/import slice.

## Rollback

- Revert this plan, the new server action, and the extra UI button/selector option.
