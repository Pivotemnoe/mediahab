# UI Phase 10az — blocked queue refresh smoke

## Objective and non-goals

Objective: extend the API-mode seeded guided queue browser smoke to verify that clicking the blocked repeatable queue refresh control reloads the page, preserves the local queued job, and renders the same refresh-required blocked state again.

Non-goals:

- Do not enable automatic replay, background sync, or browser-side mutation execution.
- Do not execute queued mutations from the browser.
- Do not implement merge UI for `version_conflict`.
- Do not change user-visible UI copy, backend product routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not persist test credentials, cookies, queued values, or screenshots in the repo.

## Current-state findings

- UI Phase 10av added a queue-level `Обновить страницу` control for refresh-required blocked jobs.
- UI Phase 10ax proves a real API-mode Content Studio page renders a seeded blocked repeatable queue with refresh recovery.
- UI Phase 10ay proves `Очистить локальную очередь` removes the local queued job and returns the queue UI to an empty state.
- The browser-level smoke does not yet prove that the refresh control actually performs a reload and that the blocked local queue state survives the reload.

## Assumptions and unresolved questions

- The refresh control remains scoped by `data-testid="guided-queue-refresh"` inside the blocked repeatable queue status line.
- `window.location.reload()` should preserve the browser-local queue job in `localStorage`.
- After reload, `performance.getEntriesByType("navigation")[0].type` should report `reload` in the current Chrome CDP smoke.
- The existing clear recovery assertion can still run after the refresh assertion.

## Files/modules to change

- Update `tools/check_guided_queue_api_seeded_smoke.mjs`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove the refresh-click assertions from the smoke.

## Security and tenancy impact

No backend mutation is added. The smoke operates on a temporary API server, a temporary browser profile, and browser-local queue storage. No auth material is written to the repository.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Keep the existing blocked repeatable queue assertions and screenshot capture.
2. Click `guided-queue-refresh` inside the blocked repeatable queue status line.
3. Wait for browser navigation type `reload`.
4. Assert the seeded localStorage job is still present.
5. Assert the blocked repeatable queue status and refresh control render again after reload.
6. Run the existing clear recovery assertion after the refresh assertion.
7. Run focused and full gates.

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

- Blocked repeatable queue renders refresh recovery in API mode.
- Clicking refresh performs a real page reload.
- The local queue job remains in `localStorage` after reload.
- The blocked repeatable queue status and refresh control render again after reload.
- The existing clear assertion still removes the job afterwards.

## Risks and recovery strategy

- Risk: navigation timing is flaky after clicking refresh. Mitigation: wait for `performance.getEntriesByType("navigation")[0].type === "reload"` and for the blocked queue DOM hook to return.
- Risk: Chrome navigation type semantics change. Mitigation: this is a smoke-only assertion; rollback removes the refresh-specific check without touching product behavior.

## Status/progress notes

- 2026-06-22: Started after UI Phase 10ay.
- 2026-06-22: Implemented refresh-click browser smoke assertions in the API-mode seeded harness.
- 2026-06-22: Owner confirmed `temichev-posthub.ru` as the production-domain candidate; deployment note added to `docs/OPEN_QUESTIONS.md`.
