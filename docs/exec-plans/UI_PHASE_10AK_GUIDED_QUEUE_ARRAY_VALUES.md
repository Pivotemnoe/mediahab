# UI Phase 10ak — guided queue array-capable values

## Objective and non-goals

Objective: make guided-form local drafts and queue jobs preserve multiple user-selected values so future replay can be lossless for `multi_select` fields.

Non-goals:

- Do not enable automatic background replay.
- Do not send queued jobs to the backend.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not add final conflict merge UI.
- Do not change fixture mode disabled behavior.

## Current-state findings

- UI Phase 10aj added typed replay draft construction from local queue jobs.
- The replay draft can type `multi_select`, but the queue contract still stores `values` as `Record<string, string>`.
- `formDraftValues` reads `.value` from form controls, which loses additional selected options from native `<select multiple>`.
- Local draft parsing and restoring also assume string-only values.

## Assumptions and unresolved questions

- Queue and local draft values should support `string | string[]` per field key.
- Existing stored jobs and drafts with string values must remain valid.
- Empty arrays and arrays containing only blank strings should not keep a queue job alive.
- Checkbox handling remains string-backed because the current boolean form submits a single checked value or blank.
- This slice preserves raw array values only; automatic replay remains blocked by cookie/CSRF and conflict rules.

## Files/modules to create or change

- Update `apps/web/src/services/guided-queue-contract.ts` with `GuidedQueueValue` and array-aware sanitization/emptiness.
- Update `apps/web/src/services/guided-queue-replay.ts` so typed replay draft passes arrays to the shared value mapper.
- Update `apps/web/src/components/phase04/guided-form-actions.tsx` local draft read/write/restore and queue job creation for arrays.
- Extend hardening harnesses for array values.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: restore string-only value types, sanitization, local draft handling, and harness expectations.

## Security and tenancy impact

No secrets, tokens, cookies, CSRF headers, authorization behavior, or tenant-scoped backend calls are added. Data remains browser-local until the existing user-triggered form action runs.

## External API/live-test prerequisites

None. Fixture visual smoke remains backend-independent.

## Step-by-step implementation order

1. Extend queue value types and parser to allow string arrays.
2. Make local form draft extraction preserve selected options from multiple selects.
3. Restore array-backed drafts into multiple selects.
4. Make replay draft type arrays correctly.
5. Extend hardening harnesses and run full checks.

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

- Queue jobs serialize and parse string arrays.
- Invalid non-string array entries are filtered.
- Empty arrays do not keep queue jobs alive.
- Replay draft converts `multi_select` arrays to full string arrays.
- Legacy string-only jobs still parse and replay as before.
- Fixture mode controls remain disabled and the guided form still renders without horizontal overflow.

## Risks and recovery strategy

- Risk: localStorage payload shape changes. Mitigation: parser remains backward-compatible with string values and filters invalid arrays.
- Risk: restoring arrays into non-multiple inputs could create invalid UI state. Mitigation: array restore is only applied to multi-select controls; other controls use the first value.
- Risk: future replay still lacks request-envelope/cookie strategy. Mitigation: this slice only preserves data needed by future replay and keeps automatic replay disabled.

## Status/progress notes

- Planned: 2026-06-21.
