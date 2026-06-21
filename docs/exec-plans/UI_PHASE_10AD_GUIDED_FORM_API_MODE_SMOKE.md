# UI Phase 10ad — guided form API-mode smoke

## Objective and non-goals

Objective: add an authenticated guided-form API-mode smoke that exercises the backend path required by frontend guided-form server actions: cookie login, CSRF-protected mutations, guided-form read, field save, stale-version conflict, and repeatable-group add.

Non-goals:

- Do not require Docker or a manually prepared local browser session.
- Do not change backend auth/CSRF semantics.
- Do not change visible frontend UI.
- Do not enable service-worker mutation replay.
- Do not solve split-domain deployment yet.

## Current-state findings

- Backend tests already cover guided-form blocks and conflict handling as part of Phase 04.
- Frontend runtime now has a checked API request CSRF header contract.
- There is no dedicated smoke command named around guided-form API-mode readiness.
- Existing `make test-e2e` checks OpenAPI path presence, not an authenticated mutation flow.

## Assumptions and unresolved questions

- TestClient with `https://testserver` is sufficient to exercise Secure cookies in local test mode.
- SQLite temporary database is acceptable for the smoke because current API tests use the same pattern.
- Browser-level authenticated API-mode smoke remains a later slice because it needs a real Next/browser session and cookie/domain setup.

## Files/modules to create or change

- Create `tools/check_guided_form_api_mode.py`.
- Update `Makefile` so `test-ui-hardening` runs the smoke.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. The smoke creates a temporary SQLite database and removes it after execution. Rollback is code-only: remove the script and its Makefile invocation.

## Security and tenancy impact

This slice strengthens security regression coverage:

- Confirms session and CSRF cookies are set by register.
- Confirms cookie-authenticated mutation without CSRF header is rejected.
- Confirms CSRF-protected guided-form mutations succeed only with the returned token.
- Confirms stale version writes return `version_conflict`.

## External API/live-test prerequisites

None. This is an in-process FastAPI smoke using the local app and temporary database.

## Step-by-step implementation order

1. Add the smoke script using existing TestClient and temporary SQLite patterns.
2. Verify register cookies, CSRF rejection, project import, content creation, guided-form read, field save, conflict, and repeatable group add.
3. Add the script to `make test-ui-hardening`.
4. Run focused and full checks, including visual smoke to confirm no fixture UI regression.
5. Write the Russian report, commit, and push.

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

- Auth cookies are present after register.
- Missing CSRF header returns `csrf_required`.
- `/guided-form` returns the expected schema.
- Saving `venue_name` with CSRF succeeds and locks the block.
- Stale content-item update returns `version_conflict`.
- Adding a `dishes` repeatable group succeeds.

## Risks and recovery strategy

- Risk: duplicating part of an API unit test. Mitigation: keep this as a smoke command with a concise scenario and clear API-mode naming.
- Risk: test runtime grows. Mitigation: use one temporary database and one end-to-end flow.

## Status/progress notes

- Planned: 2026-06-21.
