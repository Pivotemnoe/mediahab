# UI Phase 10ar — guided queue summary helper

## Objective and non-goals

Objective: add a pure summary helper for guided queue entries so future UI and diagnostics can describe queue composition without exposing queued payload values.

Non-goals:

- Do not change visible runtime UI copy in this slice.
- Do not enable automatic background replay.
- Do not send queued jobs to the backend outside existing user-triggered submit paths.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not render queued payloads, field values, cookies, tokens, or credentials.

## Current-state findings

- UI Phase 10aq made shell queue copy neutral for mixed jobs and added subtype counts inside replay readiness.
- Queue store still only exposes `listGuidedQueueEntries` and `countGuidedQueueEntries`.
- Future UI/debug surfaces need a safe way to summarize local queue composition without reading raw values into visible copy.

## Assumptions and unresolved questions

- Summary should count field jobs, repeatable group jobs, unknown legacy jobs, blocked refresh jobs, and retryable jobs.
- Summary helper should be pure and accept entries, so harnesses do not require browser localStorage.
- Visible UI can consume this helper later; this slice only prepares the safe contract.

## Files/modules to change

- Update `apps/web/src/services/guided-queue-store.ts`.
- Add or update a deterministic harness under `tools/`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove the helper and harness.

## Security and tenancy impact

No secrets or tenant-scoped backend calls are added. The summary intentionally returns counts only, never queued values or request payloads.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Add `GuidedQueueSummary` and `summarizeGuidedQueueEntries`.
2. Keep `countGuidedQueueEntries` behavior unchanged.
3. Add harness coverage for empty, field-only, repeatable, mixed, legacy, refresh-blocked, and retryable queues.
4. Run focused and full gates.

## Tests and checks

- New focused harness.
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

- Summary counts job types and recovery actions without exposing values.
- Existing queue replay and UI hardening harnesses still pass.
- Guided form visual smoke remains unchanged.

## Risks and recovery strategy

- Risk: summary semantics drift from replay readiness counts. Mitigation: use the same metadata kind classification and harness mixed cases.
- Risk: helper encourages rendering too much local queue data. Mitigation: return counts only.

## Status/progress notes

- 2026-06-22: Implemented helper and deterministic harness; full gate pending.
