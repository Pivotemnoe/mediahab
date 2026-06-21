# UI Phase 10ao — guided repeatable queue UI

## Objective and non-goals

Objective: connect durable local queue status to repeatable group creation failures in `AddRepeatableGroupActionForm`, using the repeatable queue contract from UI Phase 10an.

Non-goals:

- Do not enable automatic background replay.
- Do not send queued repeatable jobs to the backend outside the existing user-triggered submit path.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not add final merge UI for `version_conflict`.
- Do not change fixture mode disabled behavior.

## Current-state findings

- UI Phase 10an added repeatable queue metadata, storage key helper, and request-draft construction.
- `AddRepeatableGroupActionForm` currently persists browser-local drafts, but server-action failures are not copied into durable queue jobs.
- `QueueStatusLine` already renders Russian queue messages and manual replay readiness for any `GuidedQueueJob`.
- The existing `useGuidedQueue` hook is field-agnostic except for metadata extraction, so it can be extended with a metadata callback.

## Assumptions and unresolved questions

- Repeatable queue retry should remain a manual button that resubmits the same form through the existing server action.
- The queue job should record the last submit intent from the submitter button.
- Complete repeatable jobs should show the same manual replay readiness copy as field jobs.
- Automatic replay still waits for cookie/CSRF/version-conflict strategy.

## Files/modules to change

- Update `apps/web/src/components/phase04/guided-form-actions.tsx`:
  - import `guidedRepeatableGroupQueueKey`;
  - add repeatable metadata extraction;
  - allow `useGuidedQueue` to receive a metadata builder;
  - render `QueueStatusLine` in `AddRepeatableGroupActionForm`;
  - wire manual retry/clear.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove repeatable queue wiring and keep the local draft behavior.

## Security and tenancy impact

No secrets, cookies, CSRF headers, authorization behavior, or tenant-scoped backend calls are added. The queue stores browser-local form data and resubmits only when the user explicitly clicks retry/add.

## External API/live-test prerequisites

None. Existing API-mode smoke and fixture visual smoke are sufficient for this slice.

## Step-by-step implementation order

1. Add repeatable metadata extraction from the add form.
2. Parameterize `useGuidedQueue` with a metadata builder.
3. Wire repeatable form to `useGuidedQueue`, status line, clear, and retry.
4. Verify fixture mode remains disabled and status slot remains visible.
5. Run focused checks and full gate.

## Tests and checks

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

- Repeatable group form has a queue status slot.
- Fixture mode keeps add buttons disabled and queue unavailable.
- API-mode failures can create a repeatable queue job with `repeatable_group` metadata.
- Manual retry uses the existing form submit path and does not introduce background replay.

## Risks and recovery strategy

- Risk: queue metadata could miss the last submit intent. Mitigation: reuse `recordSubmitIntent` on repeatable form submit.
- Risk: retry could submit while disabled. Mitigation: retry button is gated by `canMutate`.
- Risk: hidden queue UI could imply automatic replay. Mitigation: readiness text explicitly says automatic send is disabled.

## Status/progress notes

- 2026-06-21: Planned, implemented, and verified.
