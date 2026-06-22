# UI Phase 10av — blocked queue refresh control

## Objective and non-goals

Objective: add an explicit refresh control inside guided-form local queue status when a queued job is blocked by refresh-required recovery, including repeatable group `version_conflict` jobs.

Non-goals:

- Do not enable automatic replay or background sync.
- Do not implement safe manual replay execution.
- Do not add merge UI for `version_conflict`.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not render queued payload values, cookies, tokens, or credentials.

## Current-state findings

- UI Phase 10au made blocked repeatable queue copy type-aware.
- `ActionStatus` has a refresh button for immediate server action failures.
- Persisted `QueueStatusLine` blocked jobs only expose clear queue; a user returning to a form sees refresh-required queue state without a direct refresh action in that queue surface.

## Assumptions and unresolved questions

- Refresh-required local queue jobs should show a page refresh button next to the existing clear action.
- Retry-required jobs should keep the existing manual retry button.
- Refreshing still relies on browser reload and local draft/queue persistence; no merge workflow is introduced.

## Files/modules to change

- Update `apps/web/src/components/phase04/guided-form-actions.tsx`.
- Update `tools/check_guided_repeatable_queue_ui.mjs`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove the queue-level refresh control and harness assertions.

## Security and tenancy impact

No backend calls are added. The control reloads the current page and does not expose queued values.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Add a queue-level refresh visibility condition for `status === "blocked"` and `job.recoveryAction === "refresh"`.
2. Render a Russian `Обновить страницу` button that calls existing `refreshPage`.
3. Keep retry button hidden for refresh-required jobs.
4. Extend the source-level harness for refresh control and no payload value leakage.
5. Run focused and full gates.

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

- Blocked queue jobs render `Обновить страницу`.
- Retry queue jobs continue to render manual retry instead of refresh.
- Existing fixture-mode visual smoke remains green.

## Risks and recovery strategy

- Risk: duplicate refresh controls appear when both immediate action status and queue status are visible. Mitigation: both explain the same refresh recovery; this slice keeps copy short and scoped to blocked local queue.
- Risk: user expects merge. Mitigation: copy remains explicit that refresh gets the latest version; no merge claim is made.

## Status/progress notes

- 2026-06-22: Implemented queue-level refresh control and source-level harness.
- 2026-06-22: Full local gate and visual smoke completed; ready to commit.
