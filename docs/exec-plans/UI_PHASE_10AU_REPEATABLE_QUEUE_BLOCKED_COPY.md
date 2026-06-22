# UI Phase 10au — repeatable queue blocked copy

## Objective and non-goals

Objective: make guided-form local queue status copy type-aware so repeatable group `version_conflict`/refresh-blocked jobs are not described as a single field.

Non-goals:

- Do not enable automatic replay or background sync.
- Do not implement safe manual replay execution.
- Do not add merge UI for `version_conflict`.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not render queued payload values, cookies, tokens, or credentials.

## Current-state findings

- UI Phase 10at proved repeatable group stale-version API calls return `version_conflict`.
- `useGuidedQueue` correctly marks `recoveryAction === "refresh"` jobs as `blocked`.
- `QueueStatusLine` still uses generic static copy that says `несинхронизированное поле`, even when `job.metadata.kind === "repeatable_group"`.

## Assumptions and unresolved questions

- Repeatable blocked copy should name a queued position/group addition, not a field.
- Unknown/legacy jobs should keep neutral copy.
- This slice should change visible Russian copy only inside the local queue status line.

## Files/modules to change

- Update `apps/web/src/components/phase04/guided-form-actions.tsx`.
- Update `tools/check_guided_repeatable_queue_ui.mjs`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: restore static queue status labels and harness expectations.

## Security and tenancy impact

No new backend calls or tenant-scoped behavior are added. The copy continues to show metadata category only and does not expose queued values.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Replace static `QueueStatusLine` label lookup with a small helper that can inspect `job.metadata.kind`.
2. Add repeatable-specific copy for `blocked` and `queued`.
3. Keep field and unknown fallbacks conservative.
4. Extend source-level harness to assert repeatable-aware copy and absence of queued value rendering.
5. Run focused and full gates.

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

- Repeatable queue status source contains repeatable-specific blocked/queued Russian copy.
- Queue status line still avoids queued payload values.
- Existing guided-form fixture visual smoke remains unchanged.

## Risks and recovery strategy

- Risk: copy becomes too long inside compact forms. Mitigation: use short technical copy and keep existing layout.
- Risk: field queue copy regresses. Mitigation: keep field fallback and source-level checks for both repeatable and generic labels.

## Status/progress notes

- 2026-06-22: Implemented type-aware queue status copy and source-level harness; full gate pending.
