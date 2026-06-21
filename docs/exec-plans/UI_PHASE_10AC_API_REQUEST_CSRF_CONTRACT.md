# UI Phase 10ac — API request CSRF contract

## Objective and non-goals

Objective: make the frontend API-mode mutation header contract explicit and test-covered before live authenticated guided-form smoke. `apiRequest` must forward browser cookies to the backend, derive the configured CSRF header from the server cookie context, and fail locally with `csrf_required` before sending a mutation when CSRF is missing.

Non-goals:

- Do not change backend auth or CSRF semantics.
- Do not enable automatic service-worker mutation replay.
- Do not add split-domain cookie strategy yet.
- Do not require a live backend/browser authenticated session in this slice.

## Current-state findings

- Backend mutations use `require_csrf`: the request must include a valid session cookie, a CSRF cookie, and a matching CSRF header.
- Backend auth sets `tmh_session` as HttpOnly and `tmh_csrf` as readable cookie, both SameSite `lax`.
- Frontend `apiRequest` already forwards `Cookie` and sends `X-CSRF-Token`, but the header-building contract is inline and not directly covered.
- Guided-form server actions depend on this boundary for `saveGuidedFieldAction` and `addRepeatableGroupAction`.

## Assumptions and unresolved questions

- Same-domain deployment remains the default local/API-mode assumption.
- Split-domain deployment needs a separate cookie/domain strategy and is intentionally left open.
- `requireCsrf: false` remains available only for explicit non-CSRF mutations if future API endpoints need it.

## Files/modules to create or change

- Update `apps/web/src/services/runtime.ts`.
- Create `tools/check_api_request_headers.mjs`.
- Update `Makefile` so `test-ui-hardening` runs the new contract check.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: inline the old header creation back into `apiRequest`, remove the harness from `Makefile`, and delete the new check file.

## Security and tenancy impact

This slice does not relax security. It hardens the frontend contract by asserting that CSRF-protected mutations fail before network I/O when a server action cannot read the CSRF cookie.

## External API/live-test prerequisites

None. The next slice can use this contract as a prerequisite for authenticated API-mode smoke with a local backend session.

## Step-by-step implementation order

1. Extract API request header creation from `apiRequest`.
2. Preserve current runtime behavior for cookies, JSON bodies, CSRF header names, and `csrf_required`.
3. Add a Node harness that transpiles `runtime.ts` and verifies the header contract.
4. Add the harness to `make test-ui-hardening`.
5. Run focused and full checks, including visual smoke to confirm fixture UX did not regress.
6. Write the Russian report, commit, and push.

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

- A cookie-authenticated mutation receives the original `Cookie` header.
- A body mutation receives `Content-Type: application/json`.
- CSRF-protected requests send the configured CSRF header.
- Missing CSRF throws `ApiRequestError` with `csrf_required` before fetch.
- `requireCsrf: false` does not require or send a CSRF header.

## Risks and recovery strategy

- Risk: extracting header creation changes runtime behavior subtly. Mitigation: keep the helper inside `runtime.ts` and assert exact header values.
- Risk: harness imports server-only Next APIs. Mitigation: `runtime.ts` only imports `next/headers` dynamically inside `getServerCookies`, so the pure helper can be tested without Next server context.

## Status/progress notes

- Planned: 2026-06-21.
