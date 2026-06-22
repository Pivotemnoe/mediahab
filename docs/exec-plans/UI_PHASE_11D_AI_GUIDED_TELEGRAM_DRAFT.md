# UI Phase 11D — AI-Guided Telegram Draft

## Goal

Turn the verified Telegram pilot from plain dictation into the first visible AI-guided author workflow.

## Scope

- Add an AI analysis action to the `Голосовой пилот` panel.
- Reuse existing backend AI tasks:
  - `extract-facts`
  - `suggest-hook`
- Show a concise Russian result:
  - how many facts the AI understood;
  - how many missing/uncertain areas remain;
  - how many reference examples were used;
  - the first suggested hook.
- Keep Telegram as the only publication target in this slice.

## Assumptions

- Full style learning is implemented through stored approved examples, retrieval, prompts, and future feedback,
  not through live model fine-tuning.
- Existing examples/references are already retrieved by the backend AI pipeline.
- The current UX can expose a technical AI status before the final product-level editorial assistant is built.

## Implementation

- Add `analyzePilotDraftAction` server action.
- Call `extract-facts` first, then `suggest-hook`.
- Convert `GenerationRunOut.response_json` into a short Russian status message.
- Add a button and status block to `PilotVoiceTelegramPanel`.

## Tests

- `make typecheck`
- `make lint`
- `make test`
- `pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`
- Production smoke: click `AI-разбор диктовки` on a real content item and verify no server/UI error.

## Risks

- If OpenAI is unavailable, the action should surface the existing provider error as a Russian status instead
  of blocking manual Telegram publication.
- If there are too few examples, retrieval count can be low; that is useful feedback for the next import/reference slice.

## Rollback

- Revert this plan, the new server action, and the panel button.
- Existing generated runs remain harmless audit/history rows.
