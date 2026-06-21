# UI Phase 10ag — guided action primitive values

## Objective and non-goals

Objective: extend guided-form action payload mapping beyond money so schema-known primitive fields preserve their JSON type. Boolean fields should submit `true`/`false`; number and rating fields should submit JSON numbers when the input is a strict numeric value.

Non-goals:

- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, or AI pipeline behavior.
- Do not add broad client validation or new visible user-facing copy.
- Do not implement ratings object editor, merge UI, STT upload, media upload, publication approval, or connector behavior.
- Do not infer preset-specific rubrics or project behavior in application logic.

## Current-state findings

- UI Phase 10af added hidden field type metadata and money mapping.
- `boolean`, `number`, and `rating` field types still fall back to `{ text }`.
- Checkbox controls post `value=true` only when checked; an unchecked boolean currently becomes an empty text value.
- Backend stores `value_json` as JSON and existing AI tests already use structured numeric ratings.

## Assumptions and unresolved questions

- Boolean unchecked should be stored as JSON `false`, because absence of a checkbox value is the standard HTML representation of unchecked state.
- Number/rating mapping should be strict: parse only trimmed numeric strings such as `7`, `7.5`, or `7,5`.
- Ambiguous numeric text such as `7 из 9` should preserve fallback `{ text }` until richer validation is specified.
- Rating scale validation remains backend/product-schema work and is not enforced in this slice.

## Files/modules to create or change

- Update `apps/web/src/services/guided-action-payloads.ts` with primitive JSON mapping.
- Update `tools/check_guided_action_payloads.mjs` with boolean, number, rating, and fallback checks.
- Optionally add input-mode hints in `apps/web/src/components/phase04/guided-form-actions.tsx` if needed without changing visible copy.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove primitive mapping and restore non-money field types to text fallback.

## Security and tenancy impact

No new secrets or authorization behavior. Mutations still go through server actions and backend workspace authorization. The slice reduces data-shape ambiguity before AI and publication features consume facts.

## External API/live-test prerequisites

None. Fixture visual smoke remains backend-independent; existing API-mode smoke continues to cover backend mutation endpoints.

## Step-by-step implementation order

1. Add strict primitive parsers for boolean, number, and rating.
2. Preserve `{ text }` fallback for empty or ambiguous numeric values.
3. Extend the payload contract harness with exact body assertions.
4. Run focused and full checks, visual smoke, spec validation, diff checks, then commit and push.

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
- Existing money fields still produce `{ amount, currency: "RUB" }`.
- Checked boolean fields produce `true`; unchecked boolean fields produce `false`.
- Strict number/rating values produce JSON numbers.
- Ambiguous numeric text preserves `{ text }`.
- Fixture mode controls remain disabled and the guided form still renders without horizontal overflow.

## Risks and recovery strategy

- Risk: primitive values may surprise code that assumed all values are objects. Mitigation: backend and frontend display helpers already accept primitive JSON values, and the harness checks only schema-known primitive field types.
- Risk: numeric parsing may over-accept prose. Mitigation: strict full-string matching, not first-number extraction.

## Status/progress notes

- Planned: 2026-06-21.
