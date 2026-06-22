# UI Phase 10bb — guided queue replay preflight

## Objective and non-goals

Objective: add a safe manual replay preflight surface for guided-form local queue jobs. The UI should show whether a queued job can be converted into a backend request and which request shape would be used, without displaying queued values and without executing replay.

Non-goals:

- Do not execute queued replay requests.
- Do not enable automatic replay, background sync, or service-worker mutation replay.
- Do not implement merge UI for `version_conflict`.
- Do not change backend product routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, publication behavior, or production deployment configuration.
- Do not expose queued field values in shell diagnostics, status lines, logs, screenshots, or test output.

## Current-state findings

- `buildGuidedQueueReplayRequestDraft` can already build a local request draft for guided field and repeatable group queue jobs.
- `QueueStatusLine` currently shows only a short ready/incomplete message.
- The UI has a retry button for retry-safe jobs and a refresh button for refresh-required blocked jobs, but no explicit preflight status that tells the operator what method/path class is prepared.
- UI Phase 10ay/10az proved blocked repeatable refresh/clear paths in a real API-mode browser smoke.

## Assumptions and unresolved questions

- It is safe to display HTTP method and route template category, but not queued values.
- Concrete content/block IDs are not secrets, but the UI should avoid making them the main visible copy; data attributes may expose route class/status for tests.
- Future manual replay execution should reuse this preflight rather than building a second request-shape model.

## Files/modules to change

- Update `apps/web/src/components/phase04/guided-form-actions.tsx`.
- Add/update a source-level hardening harness for the preflight surface.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove the preflight status line and source harness updates.

## Security and tenancy impact

No backend mutation is added. The preflight surface must not display queued values. Backend remains the authority for workspace authorization, roles, validation, CSRF, and optimistic version checks when replay execution is implemented later.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Add a small preflight view model derived from `buildGuidedQueueReplayRequestDraft`.
2. Render a Russian preflight line inside `QueueStatusLine`.
3. Add stable DOM attributes for preflight status and route class.
4. Update hardening harness to assert ready/incomplete copy and absence of queued value rendering.
5. Run focused and full gates.

## Tests and checks

- `node tools/check_guided_queue_replay_preflight.mjs`
- `make test-ui-hardening`
- `make test`
- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Fixture visual smoke on `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Demo/acceptance evidence

Acceptance evidence should show:

- Ready field and repeatable queue jobs expose safe preflight status.
- Incomplete jobs expose missing metadata/values status.
- Preflight copy does not include queued values.
- Retry/refresh/clear behavior remains unchanged.

## Risks and recovery strategy

- Risk: preflight copy looks like actual replay execution. Mitigation: copy explicitly says the request is prepared locally and not sent.
- Risk: route details expose too much. Mitigation: show method and route class, not queued values.

## Status/progress notes

- 2026-06-22: Started after UI Phase 10ba.
- 2026-06-22: Implemented safe preflight copy and DOM attributes for queued guided-form jobs.
- 2026-06-22: API-mode seeded smoke confirms ready repeatable preflight without exposing queued values.
