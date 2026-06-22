# UI Phase 10ap — guided repeatable queue UI harness

## Objective and non-goals

Objective: add a deterministic hardening harness that verifies the repeatable group queue UI wiring introduced in UI Phase 10ao remains present.

Non-goals:

- Do not change runtime UX behavior in this slice.
- Do not enable automatic background replay.
- Do not send queued repeatable jobs to the backend outside the existing user-triggered submit path.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not add final merge UI for `version_conflict`.

## Current-state findings

- UI Phase 10ao connected `AddRepeatableGroupActionForm` to `useGuidedQueue`.
- The visual smoke checks the fixture page and queue status slots, but it does not directly assert the source-level repeatable queue wiring.
- Existing UI hardening checks are small deterministic harness scripts under `tools/` and are run by `make test-ui-hardening`.

## Assumptions and unresolved questions

- A source-level harness is appropriate here because the repeatable failure state is hard to trigger through fixture mode.
- The harness should verify structural wiring, not duplicate TypeScript type checking.
- Live API-mode failure/retry behavior can follow in a later slice.

## Files/modules to change

- Add `tools/check_guided_repeatable_queue_ui.mjs`.
- Update `Makefile` so `make test-ui-hardening` runs the new harness.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove the harness and its Makefile entry.

## Security and tenancy impact

No runtime security behavior changes. The harness only reads source files.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Add source-level harness for `AddRepeatableGroupActionForm` queue wiring.
2. Add it to `make test-ui-hardening`.
3. Run focused and full gates.

## Tests and checks

- `node tools/check_guided_repeatable_queue_ui.mjs`
- `make test-ui-hardening`
- `make test`
- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke on `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Demo/acceptance evidence

Acceptance evidence should show:

- The harness fails if repeatable queue metadata/key/status/retry wiring is removed.
- Existing field queue behavior remains untouched.
- Full UI hardening target includes the new harness.

## Risks and recovery strategy

- Risk: a source-level harness can become too brittle. Mitigation: assert coarse structural invariants instead of exact formatting.
- Risk: harness may duplicate typecheck. Mitigation: focus on behavior wiring that typecheck cannot prove.

## Status/progress notes

- 2026-06-22: Planned, implemented, and verified.
