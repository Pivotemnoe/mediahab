# UI Phase 10af — guided action value mapping

## Objective and non-goals

Objective: make guided-form mutation payloads preserve known typed field values instead of sending every field as `{ text }`. The first required typed value is `money`, because backend tests and AI examples already use `{ amount, currency }` for dish prices.

Non-goals:

- Do not change backend routes, OpenAPI, database schema, migrations, or generated clients.
- Do not add new visible UI copy except existing form/status behavior.
- Do not enable fixture mutations.
- Do not implement full client-side validation, merge UI, live STT upload, media upload, publication, or connector behavior.
- Do not infer project-specific presets in application logic.

## Current-state findings

- `GuidedFieldActionForm` posts field value without the raw field type.
- `AddRepeatableGroupActionForm` posts repeatable `field:*` values, but `newItemFields` only includes `typeLabel`, not the raw schema type.
- `guided-action-payloads.ts` maps all values to `{ text }`.
- Backend repeatable group tests already accept typed money values such as `{ "price": { "amount": 350, "currency": "RUB" } }`.

## Assumptions and unresolved questions

- `RUB` remains the conservative default for money values in this Russian UI slice until project-level currency settings are exposed in the guided form contract.
- Empty optional money input should remain `{ text: "" }` rather than inventing zero.
- Unparseable non-empty money input should preserve user input as `{ text }` to avoid data loss.
- Type-aware mapping for `number`, `rating`, boolean, media, and select fields can follow in later slices after their backend DTO expectations are made explicit.

## Files/modules to create or change

- Update `apps/web/src/services/content.ts` so repeatable `newItemFields` includes the raw field type.
- Update `apps/web/src/components/phase04/guided-form-actions.tsx` to submit hidden field type metadata.
- Update `apps/web/src/services/guided-action-payloads.ts` with a scoped type-aware value mapper.
- Update `tools/check_guided_action_payloads.mjs` to cover money mapping for single fields and repeatable group additions.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove hidden `fieldType` inputs, remove the raw type from `newItemFields`, and restore the payload builder to text-only values.

## Security and tenancy impact

No new secrets, browser tokens, or authorization behavior. Mutations continue to go through server actions and backend workspace authorization. The slice reduces accidental data-shape drift by making the client-side JSON value mapping test-covered.

## External API/live-test prerequisites

None. Existing fixture visual smoke remains backend-independent; existing API-mode hardening smoke continues to cover backend behavior.

## Step-by-step implementation order

1. Add raw field type to repeatable `newItemFields`.
2. Submit hidden `fieldType` metadata for single-field and repeatable guided-action forms.
3. Add a pure `money` mapper in `guided-action-payloads.ts`.
4. Extend the payload harness to assert typed money DTOs and text fallback.
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

- Existing text fields still produce `{ text }`.
- A single money field with `fieldType=money` produces `{ amount, currency: "RUB" }`.
- A repeatable money child such as `price` produces `{ amount, currency: "RUB" }`.
- Empty or unparseable money values preserve text fallback rather than inventing values.
- Fixture mode controls remain disabled and the guided form still renders without horizontal overflow.

## Risks and recovery strategy

- Risk: money parsing could over-normalize user input. Mitigation: only parse clear numeric tokens and preserve text fallback otherwise.
- Risk: hidden metadata could affect local draft behavior. Mitigation: draft helpers only persist `value` and `field:*` controls, not `fieldType` inputs.

## Status/progress notes

- Planned: 2026-06-21.
