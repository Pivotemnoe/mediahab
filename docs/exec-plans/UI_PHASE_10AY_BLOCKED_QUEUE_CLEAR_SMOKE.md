# UI Phase 10ay — blocked queue clear smoke

## Objective and non-goals

Objective: extend the API-mode seeded guided queue browser smoke to verify that a blocked repeatable queue job can be cleared locally without executing backend replay.

Non-goals:

- Do not enable automatic replay or background sync.
- Do not execute queued mutations from the browser.
- Do not implement merge UI for `version_conflict`.
- Do not change user-visible UI copy, backend product routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not persist test credentials, cookies, queued values, or screenshots in the repo.

## Current-state findings

- UI Phase 10ax proves a real API-mode Content Studio page renders a seeded blocked repeatable queue job with refresh recovery.
- The same surface includes `Очистить локальную очередь`, but the smoke does not yet prove it removes the localStorage job and returns the queue UI to an empty state.
- Clear recovery is safe to test because it is browser-local and must not call backend replay.

## Assumptions and unresolved questions

- The smoke can trigger the clear control via the stable `guided-queue-clear` test id added in UI Phase 10aw.
- After clearing, the repeatable queue key should be absent from `localStorage`.
- The blocked repeatable queue node should disappear, and at least one queue status line should report `empty`.

## Files/modules to change

- Update `tools/check_guided_queue_api_seeded_smoke.mjs`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove the clear recovery assertions from the smoke.

## Security and tenancy impact

No backend mutation is added. The smoke clears only a temporary browser-local queue entry in a temporary Chrome profile.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. In the API-mode seeded smoke, keep the existing blocked repeatable queue assertions and screenshots.
2. Click `guided-queue-clear` inside the blocked queue status line.
3. Assert the seeded localStorage key is removed.
4. Assert the blocked repeatable queue status is gone and an empty queue status is visible.
5. Run focused and full gates.

## Tests and checks

- `node tools/check_guided_queue_api_seeded_smoke.mjs`
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

- Blocked repeatable queue still renders refresh recovery in API mode.
- Clear action removes the seeded queue key from localStorage.
- Blocked repeatable queue status disappears after clear.
- Empty queue status becomes visible after clear.

## Risks and recovery strategy

- Risk: clicking clear before React hydration could be flaky. Mitigation: wait for the blocked queue DOM hook before clicking.
- Risk: multiple queue status nodes make assertions ambiguous. Mitigation: scope clear lookup to the blocked repeatable queue node and then assert that no matching blocked node remains.

## Status/progress notes

- 2026-06-22: Started after UI Phase 10ax.
- 2026-06-22: Implemented clear recovery assertions in the API-mode seeded smoke.
- 2026-06-22: Focused API-mode smoke and fixture visual smoke passed on 390px and 1440px; full local gate completed.
