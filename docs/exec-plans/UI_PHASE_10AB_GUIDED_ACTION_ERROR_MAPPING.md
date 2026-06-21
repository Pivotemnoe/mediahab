# UI Phase 10ab — guided action error mapping harness

## Objective and non-goals

Objective: make guided-form server-action error mapping explicit, reusable, and covered by the UI hardening gate before moving to live authenticated API-mode smoke.

Non-goals:

- Do not change visible guided-form UI behavior.
- Do not enable automatic offline mutation replay.
- Do not change backend API, OpenAPI, migrations, or cookie/CSRF strategy.
- Do not add live backend/browser API-mode smoke in this slice.

## Current-state findings

- `saveGuidedFieldAction` and `addRepeatableGroupAction` already return `GuidedActionState` instead of throwing raw API errors.
- Russian messages for `csrf_required`, `csrf_invalid`, and `version_conflict` live inline in `apps/web/src/services/content-actions.ts`.
- `make test-ui-hardening` covers service worker capabilities and guided queue replay readiness, but not guided action error mapping.
- Fixture mode keeps guided mutation buttons disabled; API mode enables them only with real content metadata.

## Assumptions and unresolved questions

- `version_conflict` remains a warning with `refresh` recovery.
- CSRF errors remain `danger` tone with `refresh` recovery.
- Backend 5xx and non-API exceptions remain retryable from the UI state perspective.
- Live split-domain cookie/CSRF strategy is still unresolved and belongs to a later slice.

## Files/modules to create or change

- Create `apps/web/src/services/guided-action-errors.ts`.
- Update `apps/web/src/services/content-actions.ts` to use the extracted mapper.
- Create `tools/check_guided_action_errors.mjs`.
- Update `Makefile` so `test-ui-hardening` runs the new harness.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: restore the inline mapper in `content-actions.ts`, remove the harness from `Makefile`, and delete the new helper/test files.

## Security and tenancy impact

No authorization or tenancy behavior changes. This slice reduces risk by making CSRF/version-conflict user-facing handling deterministic and test-covered.

## External API/live-test prerequisites

None for this slice. Live authenticated API-mode smoke remains a follow-up requiring local backend auth state and CSRF cookie strategy.

## Step-by-step implementation order

1. Extract guided action error mapping from `content-actions.ts`.
2. Update server actions to call the extracted mapper.
3. Add a Node harness that transpiles and asserts the mapper behavior.
4. Add the harness to `make test-ui-hardening`.
5. Run focused and full checks, including visual smoke to confirm no UI regression.
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

- `csrf_required` and `csrf_invalid` map to Russian CSRF messages and `refresh`.
- `version_conflict` maps to Russian conflict message, `refresh`, and warning tone.
- Server/backend unavailable cases stay retryable.
- Fixture visual smoke still shows disabled mutation controls and status slots.

## Risks and recovery strategy

- Risk: server-only `ApiRequestError` import leaks into a client-safe helper. Mitigation: keep the extracted helper structural and dependency-light.
- Risk: message text changes unintentionally. Mitigation: harness checks key Russian fragments and recovery/tone semantics.

## Status/progress notes

- Planned: 2026-06-21.
