# UI Phase 10as — guided queue safe diagnostics

## Objective and non-goals

Objective: surface the safe guided queue composition summary from UI Phase 10ar in shell/offline diagnostics so users can distinguish queued field saves, repeatable group additions, blocked refresh jobs, and legacy/unknown jobs without exposing queued values.

Non-goals:

- Do not render queued payload values, field text, draft names, cookies, tokens, or credentials.
- Do not enable automatic replay or background sync.
- Do not send queued jobs to the backend outside existing user-triggered submit paths.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not redesign the offline banner beyond a small technical UX diagnostic.

## Current-state findings

- UI Phase 10ar added `summarizeGuidedQueueEntries`, which returns counts only.
- `OfflineStatus` already listens to queue changes and renders `GuidedQueueReplayReadiness.shellMessage`.
- Shell/offline diagnostics currently do not expose queue composition beyond total count.

## Assumptions and unresolved questions

- The diagnostic text should be short Russian copy appended inside the existing offline/manual retry banner.
- Empty or no-message states should remain visually unchanged.
- Legacy/unknown jobs should be named conservatively as `неопознанные изменения`.
- `refresh` recovery jobs should be named as `требуют обновления`, not as replayable work.

## Files/modules to change

- Update `apps/web/src/components/pwa/offline-status.tsx`.
- Add or update a deterministic source-level harness under `tools/`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove the diagnostic helper/copy and harness changes.

## Security and tenancy impact

No tenant-scoped backend calls are added. The diagnostic must consume summary counts only and must not expose local queued values.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Add a small formatter for `GuidedQueueSummary` in `OfflineStatus`.
2. Render the diagnostic only when a shell/offline message is already visible and queue count is non-zero.
3. Keep Russian visible copy compact and technical.
4. Add source-level harness checks for copy and absence of queued values.
5. Run focused and full gates.

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

- Banner diagnostics can mention field, repeatable, blocked, and unknown queue composition.
- The diagnostic helper does not include queued values.
- Fixture-mode visual smoke remains unchanged for empty queue.

## Risks and recovery strategy

- Risk: banner becomes too noisy on mobile. Mitigation: keep the diagnostic as a second short line and only show it when queue jobs exist.
- Risk: future copy accidentally exposes values. Mitigation: harness checks forbidden sample payload strings.

## Status/progress notes

- 2026-06-22: Implemented formatter, shell diagnostic rendering, and deterministic harness; full gate pending.
