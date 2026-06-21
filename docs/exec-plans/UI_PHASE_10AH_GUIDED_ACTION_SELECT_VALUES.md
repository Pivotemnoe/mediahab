# UI Phase 10ah — guided action select values

## Objective and non-goals

Objective: extend guided-form action payload mapping for schema-known select fields. Single select fields should preserve the selected value as a JSON string; multi-select fields should preserve selected values as a JSON string array.

Non-goals:

- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI pipeline behavior, or publication behavior.
- Do not add new visible UI copy.
- Do not implement full options editing, schema validation, media picker DTOs, STT upload, merge UI, or publication approval.
- Do not infer preset-specific choices or rubrics in application logic.

## Current-state findings

- UI Phase 10af/10ag added hidden field type metadata and typed mapping for money, boolean, number, and rating.
- `select` and `multi_select` still fall back to `{ text }`, even though the canonical spec lists them as dynamic field types.
- Current UI renders select-like controls from schema field type, but the mutation builder only reads one `value` entry for single-field saves and overwrites repeated `field:*` entries in repeatable group additions.

## Assumptions and unresolved questions

- `select` should store the selected machine value as a JSON string, not `{ text }`.
- `multi_select` should store all non-empty selected values as a JSON string array.
- Empty `select` stores an empty string; empty `multi_select` stores an empty array.
- Option lists and human labels are schema/UI-schema concerns and remain outside this slice.
- `media_picker` remains a later slice because media needs IDs/order/asset metadata, not string coercion.

## Files/modules to create or change

- Update `apps/web/src/services/guided-action-payloads.ts` so typed value mapping can receive multiple form values.
- Update `apps/web/src/components/phase04/guided-form-actions.tsx` so multi-select controls can submit multiple values when schema options arrive.
- Update `tools/check_guided_action_payloads.mjs` with select, multi-select, and repeatable multi-select assertions.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove select/multi-select mapping and restore text fallback behavior.

## Security and tenancy impact

No secrets or authorization changes. Mutations still go through server actions and backend workspace authorization. The slice reduces data-shape ambiguity before AI and publication flows consume structured facts.

## External API/live-test prerequisites

None. Fixture visual smoke remains backend-independent; API-mode smoke continues to cover backend mutation routes.

## Step-by-step implementation order

1. Add multi-value form data helpers in the guided action payload builder.
2. Add `select` and `multi_select` mapping.
3. Preserve existing text/money/primitive behavior.
4. Add contract harness assertions for single-field and repeatable select values.
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
- Existing money, boolean, number, and rating mappings still pass.
- `fieldType=select` produces a JSON string.
- `fieldType=multi_select` produces a JSON array of non-empty strings.
- Repeatable multi-select child values do not overwrite repeated form entries.
- Fixture mode controls remain disabled and the guided form still renders without horizontal overflow.

## Risks and recovery strategy

- Risk: frontend may not yet have real option metadata. Mitigation: this slice changes payload shape only when schema field type is explicitly `select` or `multi_select`; it does not invent options.
- Risk: repeated FormData handling may alter repeatable group behavior. Mitigation: harness checks existing repeatable fields and new repeated entries.

## Status/progress notes

- Planned: 2026-06-21.
