# UI Phase 10aw — guided queue DOM hooks for seeded smoke

## Objective and non-goals

Objective: add stable, non-user-visible DOM hooks to guided-form queue status lines and recovery buttons so the next browser-seeded API-mode smoke can verify blocked repeatable queue refresh behavior without relying on brittle Russian text matching.

Non-goals:

- Do not enable automatic replay or background sync.
- Do not implement browser-seeded API smoke in this slice.
- Do not change visible Russian copy, backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not expose queued payload values, cookies, tokens, or credentials.

## Current-state findings

- UI Phase 10av added a visible `Обновить страницу` button for blocked refresh-required queue jobs.
- Fixture mode keeps mutation controls disabled, so seeded localStorage jobs cannot show a queue status line there.
- API-mode browser smoke needs stable selectors once it seeds a real content item's repeatable queue key.
- Existing queue UI has source-level harness coverage but no stable DOM contract for status/recovery selectors.

## Assumptions and unresolved questions

- Data attributes are acceptable for testability because they expose only status, metadata kind, and recovery action.
- Test ids should be generic and not include content IDs, field keys, queued values, request IDs, cookies, or tokens.
- A later slice will own authenticated API-mode browser setup and localStorage seeding.

## Files/modules to change

- Update `apps/web/src/components/phase04/guided-form-actions.tsx`.
- Update `tools/check_guided_repeatable_queue_ui.mjs`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove the data attributes/test ids and harness assertions.

## Security and tenancy impact

No backend calls are added. DOM hooks expose only coarse UI state already visible to the user.

## External API/live-test prerequisites

None for this slice.

## Step-by-step implementation order

1. Add stable data attributes to `QueueStatusLine` root for queue status, job metadata kind, and recovery action.
2. Add stable test ids to refresh, retry, and clear queue buttons.
3. Extend the repeatable queue UI harness to assert these DOM hooks exist and do not include queued values.
4. Run focused and full gates.

## Tests and checks

- `node tools/check_guided_repeatable_queue_ui.mjs`
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

- `QueueStatusLine` has stable status/kind/recovery DOM hooks.
- Refresh, retry, and clear queue controls have stable test ids.
- Existing fixture-mode visual smoke remains green.

## Risks and recovery strategy

- Risk: DOM hooks become an implicit public API. Mitigation: keep them limited to internal test selectors and document their purpose in this phase plan.
- Risk: attributes accidentally expose sensitive values. Mitigation: only status, metadata kind, and recovery action are emitted.

## Status/progress notes

- 2026-06-22: Started after UI Phase 10av.
- 2026-06-22: Implemented queue status DOM hooks and recovery button test ids.
- 2026-06-22: Full local gate and visual smoke completed; ready to commit.
