# UI Phase 10at — repeatable queue failure API smoke

## Objective and non-goals

Objective: extend the authenticated API-mode guided-form smoke so repeatable group creation has explicit stale-version failure evidence before the successful current-version path. This strengthens the guided queue failure contract without enabling replay execution.

Non-goals:

- Do not enable automatic background replay.
- Do not implement safe manual replay execution.
- Do not change server action cookie/CSRF forwarding strategy.
- Do not add merge UI for `version_conflict`.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not render queued payload values, cookies, tokens, or credentials.

## Current-state findings

- `tools/check_guided_form_api_mode.py` already proves authenticated guided-form API-mode single-field success, stale content-item `version_conflict`, and repeatable group success.
- Repeatable group stale-version failure is not asserted directly.
- Frontend repeatable queue UI can queue failures, but the API-mode smoke does not yet prove the backend failure code that drives that queue state.

## Assumptions and unresolved questions

- Repeatable group creation should use the same content-item optimistic version guard as field block creation.
- A stale repeatable group POST should return `409` with error code `version_conflict`.
- After the stale failure, a retry with the current content item version should still succeed and create group blocks.

## Files/modules to change

- Update `tools/check_guided_form_api_mode.py`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is test-only: remove the additional stale repeatable assertion.

## Security and tenancy impact

No new runtime behavior or secrets are introduced. The smoke continues to use isolated in-memory/local SQLite state and test cookies.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Add a stale repeatable group POST in `tools/check_guided_form_api_mode.py` after the content item version has advanced.
2. Assert `409` and `version_conflict`.
3. Keep the existing current-version repeatable group success path.
4. Run focused and full gates.

## Tests and checks

- `python tools/check_guided_form_api_mode.py`
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

- Stale repeatable group creation returns `version_conflict`.
- Current-version repeatable group creation still succeeds after the stale failure.
- Existing guided queue and visual smoke checks remain green.

## Risks and recovery strategy

- Risk: the smoke becomes order-sensitive because the content version changes. Mitigation: fetch the current content item before the successful repeatable POST.
- Risk: this looks like replay execution. Mitigation: this slice only exercises backend API conflict behavior in a test harness; no frontend replay is enabled.

## Status/progress notes

- 2026-06-22: Implemented stale repeatable version-conflict assertion in API-mode smoke; full gate pending.
