# UI Phase 10am — guided queue manual replay readiness UI

## Objective and non-goals

Objective: make the guided-form queue UI expose whether a queued single-field job has a complete request draft for manual replay, without executing the replay.

Non-goals:

- Do not enable automatic background replay.
- Do not send queued jobs to the backend.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not add final conflict merge UI.
- Do not add durable queue UI for repeatable group creation in this slice.
- Do not change fixture mode disabled behavior.

## Current-state findings

- UI Phase 10al added `buildGuidedQueueReplayRequestDraft`, which can return `ready` or `incomplete`.
- `QueueStatusLine` currently shows only a generic local queue status, code, request ID, retry, and clear actions.
- The user cannot see whether a queued job has enough stored metadata for manual replay preparation.
- Existing fixture mode keeps mutation controls disabled, so this UI should remain hidden there unless a queue job is actually present.

## Assumptions and unresolved questions

- Queue readiness text should be Russian and short.
- The UI should not expose raw paths or payload bodies by default; those are technical diagnostics and could become noisy.
- Incomplete draft reasons can be mapped to Russian labels for `metadata`, `metadata.intent`, and `values.value`.
- Actual replay execution remains blocked by cookie/CSRF and version-conflict strategy.

## Files/modules to create or change

- Update `apps/web/src/components/phase04/guided-form-actions.tsx` to call `buildGuidedQueueReplayRequestDraft` for queued jobs.
- Add Russian readiness text inside `QueueStatusLine`.
- Extend visual smoke expectation to include the status space if useful.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove replay-readiness UI and helper usage from `QueueStatusLine`.

## Security and tenancy impact

No secrets, tokens, cookies, CSRF headers, authorization behavior, or tenant-scoped backend calls are added. The UI reads browser-local queue data only and does not transmit it.

## External API/live-test prerequisites

None. Fixture visual smoke remains backend-independent.

## Step-by-step implementation order

1. Import request-draft helper into guided form actions.
2. Add a small view-model function mapping ready/incomplete drafts to Russian UI text.
3. Render the readiness text only when a queue job exists.
4. Run focused checks and full gate.

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

- Type checking covers the new component/helper usage.
- Hardening harnesses still prove request draft behavior.
- Fixture mode controls remain disabled and the guided form still renders without horizontal overflow.
- Queue UI has a Russian manual replay readiness message when a job exists.

## Risks and recovery strategy

- Risk: readiness UI could imply automatic replay. Mitigation: copy explicitly says manual repeat only and no automatic send.
- Risk: incomplete reason labels could be too technical. Mitigation: map known keys to short Russian labels.
- Risk: stale legacy jobs remain incomplete. Mitigation: this is expected and surfaced explicitly.

## Status/progress notes

- 2026-06-21: Planned, implemented, and verified.
