# UI Phase 10aq — guided queue mixed-job copy

## Objective and non-goals

Objective: update shell-level guided queue readiness copy so it correctly describes a mixed local queue with field saves and repeatable group additions.

Non-goals:

- Do not enable automatic background replay.
- Do not send queued jobs to the backend outside existing user-triggered submit paths.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not add final merge UI for `version_conflict`.

## Current-state findings

- UI Phase 10ao/10ap added repeatable group queue UI and a hardening harness.
- `getGuidedQueueReplayReadiness` still says `несинхронизированные поля` and formats counts as `поле/поля/полей`.
- The shell banner is now fed by `listGuidedQueueEntries`, which can include both field and repeatable group jobs.

## Assumptions and unresolved questions

- Shell copy should use neutral `изменение/изменения/изменений` wording for all guided queue jobs.
- `jobCount` remains the compatibility field for UI consumers.
- Optional subtype counts can help future UI/debug decisions, but the banner should stay concise.

## Files/modules to change

- Update `apps/web/src/services/guided-queue-replay.ts`.
- Update `tools/check_guided_queue_replay.mjs`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: restore field-only copy and harness expectations.

## Security and tenancy impact

No runtime security behavior changes. Queue payloads remain local and are not rendered in the shell banner.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Add guided queue job type counters to readiness calculation.
2. Replace field-only shell wording with neutral change-count wording.
3. Extend harness coverage for field-only, repeatable-only, and mixed queues.
4. Run focused and full gates.

## Tests and checks

- `node tools/check_guided_queue_replay.mjs`
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

- Shell readiness no longer says queued repeatable group additions are fields.
- Russian plural forms are correct for 1, 2, 5, and 11 local changes.
- Existing PWA flags and guided form visual smoke remain unchanged.

## Risks and recovery strategy

- Risk: changing copy breaks old assertions. Mitigation: update hardening harness and visual smoke remains based on stable UI slots.
- Risk: subtype counts could be misread as a replay capability. Mitigation: keep `canAutoReplay=false` and existing replay reason.

## Status/progress notes

- 2026-06-22: Planned, implemented, and verified.
