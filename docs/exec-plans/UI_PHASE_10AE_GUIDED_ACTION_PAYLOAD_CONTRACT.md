# UI Phase 10ae — guided action payload contract

## Objective and non-goals

Objective: make the Next guided-form server-action payload contract explicit and test-covered. The hidden inputs and visible form fields rendered by the guided-form UI must produce the correct backend path, HTTP method, JSON body, lock flag, version field, and success message before the server action calls `apiRequest`.

Non-goals:

- Do not change visible frontend UI.
- Do not change backend API, OpenAPI, or migrations.
- Do not add a browser-authenticated live Next server-action test in this slice.
- Do not enable service-worker mutation replay.

## Current-state findings

- `GuidedFieldActionForm` posts `contentId`, `fieldKey`, optional `blockId`, `itemVersion`, `sourceType`, `value`, and `intent`.
- `AddRepeatableGroupActionForm` posts `contentId`, `groupKey`, optional `itemVersion`, `sourceType`, `intent`, and `field:*` values.
- `content-actions.ts` currently parses form data and builds API requests inline, which makes the server-action payload contract harder to test directly.
- Backend API-mode smoke now verifies the actual FastAPI endpoints, auth cookies, CSRF, version conflict, and repeatable group behavior.

## Assumptions and unresolved questions

- `intent=lock` remains the only lock trigger.
- Missing optional values keep current behavior: text fields default to empty string and version can be `null`.
- `field:*` repeatable values remain text values for the current UI slice.
- Browser-level authenticated server-action smoke remains a later slice.

## Files/modules to create or change

- Create `apps/web/src/services/guided-action-payloads.ts`.
- Update `apps/web/src/services/content-actions.ts` to use the extracted builders.
- Create `tools/check_guided_action_payloads.mjs`.
- Update `Makefile` so `test-ui-hardening` runs the new payload contract check.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: move payload parsing back into `content-actions.ts`, remove the harness from `Makefile`, and delete the new helper/test files.

## Security and tenancy impact

No authorization behavior changes. The slice reduces mutation risk by making content IDs, version values, lock intent, and backend paths deterministic and test-covered before live browser server-action smoke.

## External API/live-test prerequisites

None for this slice.

## Step-by-step implementation order

1. Extract pure payload builders for single-field save and repeatable group add.
2. Update server actions to call the builders and keep existing success/error states.
3. Add a Node harness that transpiles and asserts the builder behavior with real `FormData`.
4. Add the harness to `make test-ui-hardening`.
5. Run focused and full checks, including visual smoke.
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

- Existing block save uses `PATCH /api/v1/content-blocks/{blockId}` without item version.
- New field save uses `PUT /api/v1/content-items/{contentId}/blocks/{fieldKey}` with version.
- `intent=lock` sets `lock: true` and lock success copy.
- Repeatable group add uses `POST /api/v1/content-items/{contentId}/repeatable-groups/{groupKey}` with `field:*` values.
- Missing required hidden fields still throw a clear local error.

## Risks and recovery strategy

- Risk: extraction changes request bodies subtly. Mitigation: harness checks exact normalized path/method/body/success copy.
- Risk: builder becomes too generic. Mitigation: keep it scoped to guided-form actions only.

## Status/progress notes

- Planned: 2026-06-21.
