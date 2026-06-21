# UI Phase 10ai — guided queue field types

## Objective and non-goals

Objective: make local guided-form queue jobs preserve schema field type metadata alongside draft values. This keeps queued jobs compatible with typed guided-action payload mapping for money, boolean, number, rating, select, and multi-select fields.

Non-goals:

- Do not enable automatic background replay.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI pipeline behavior, media upload, or publication behavior.
- Do not add new visible UI copy.
- Do not implement merge/conflict resolution beyond the existing refresh/retry status UI.

## Current-state findings

- UI Phase 10af-10ah added typed payload mapping based on hidden `fieldType` and `fieldType:<key>` form metadata.
- `GuidedQueueJob` currently stores only `values`, `code`, `requestId`, `recoveryAction`, and `savedAt`.
- Queue creation uses `formDraftValues()`, which intentionally stores only editable values and excludes hidden metadata.
- Manual retry through the still-mounted form can use current hidden inputs, but serialized queue jobs are not ready for future replay because field type metadata is missing.

## Assumptions and unresolved questions

- Queue jobs should remain backward-compatible with already stored local jobs that do not include `fieldTypes`.
- `fieldTypes` should be a plain `Record<string, string>` keyed by the submitted field name:
  - `value` for single-field forms;
  - `field:<key>` for repeatable child fields.
- Queue job emptiness should continue to depend on user-editable `values`, not hidden metadata.
- Automatic replay remains blocked by HttpOnly cookie and CSRF constraints until an explicit strategy is implemented.

## Files/modules to create or change

- Update `apps/web/src/services/guided-queue-contract.ts`.
- Update `apps/web/src/components/phase04/guided-form-actions.tsx` to capture field type metadata when queue jobs are created.
- Add `tools/check_guided_queue_contract.mjs`.
- Update `Makefile` so `test-ui-hardening` runs the new queue contract harness.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove `fieldTypes` from `GuidedQueueJob`, queue creation, and the hardening harness.

## Security and tenancy impact

No secrets, tokens, or authorization behavior are added. Field type metadata is schema-derived and non-sensitive. Queue jobs remain browser-local and are not transmitted automatically.

## External API/live-test prerequisites

None. Fixture visual smoke remains backend-independent; API-mode smoke continues to cover backend mutation routes.

## Step-by-step implementation order

1. Extend `GuidedQueueJob` with optional/backward-compatible `fieldTypes`.
2. Capture hidden field type metadata from guided action forms when queue jobs are created.
3. Add a Node harness for queue job serialization/parsing and field type preservation.
4. Add the harness to `make test-ui-hardening`.
5. Run focused and full checks, visual smoke, spec validation, diff checks, then commit and push.

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

- New queue jobs serialize and parse `fieldTypes`.
- Old queue jobs without `fieldTypes` still parse with an empty `fieldTypes` object.
- Invalid non-string field type values are ignored.
- Queue value detection still ignores metadata-only jobs.
- Fixture mode controls remain disabled and the guided form still renders without horizontal overflow.

## Risks and recovery strategy

- Risk: local storage payload shape changes. Mitigation: parser defaults missing `fieldTypes` to `{}` and filters invalid values.
- Risk: hidden metadata could make empty queues appear non-empty. Mitigation: `hasGuidedQueueValues` still checks only editable `values`.

## Status/progress notes

- Planned: 2026-06-21.
