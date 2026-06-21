# UI Phase 10an — guided queue repeatable group contract

## Objective and non-goals

Objective: extend the guided-form local queue contract so repeatable group creation jobs can be represented and converted into a manual replay request draft, without executing that replay.

Non-goals:

- Do not enable automatic background replay.
- Do not send queued repeatable jobs to the backend.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not add final repeatable queue UI in this slice.
- Do not change fixture mode disabled behavior.

## Current-state findings

- UI Phase 10am exposed manual replay readiness for queued single-field jobs.
- `GuidedQueueMetadata` currently accepts only `kind: "field"` metadata.
- `buildAddRepeatableGroupPayload` already defines the backend request shape for repeatable group creation.
- `AddRepeatableGroupActionForm` has local draft persistence, but no durable queue job contract yet.

## Assumptions and unresolved questions

- Repeatable group queue jobs need `contentId`, `groupKey`, `intent`, `itemVersion`, and `sourceType`.
- Repeatable job values use existing `field:<key>` and `fieldType:<key>` naming from the add form.
- Incomplete jobs should report concrete missing keys instead of fabricating a request.
- UI wiring can follow after the pure contract is covered by harnesses.

## Files/modules to change

- Update `apps/web/src/services/guided-queue-contract.ts` with repeatable metadata and queue key helpers.
- Update `apps/web/src/services/guided-queue-replay.ts` to build a `POST /repeatable-groups/{groupKey}` request draft.
- Extend `tools/check_guided_queue_contract.mjs`.
- Extend `tools/check_guided_queue_replay.mjs`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove repeatable metadata/key/replay handling and related harness assertions.

## Security and tenancy impact

No secrets, cookies, CSRF headers, authorization behavior, or tenant-scoped backend calls are added. This slice only transforms browser-local queue data into a not-executed request draft.

## External API/live-test prerequisites

None. The slice is pure frontend/service-contract code.

## Step-by-step implementation order

1. Add repeatable queue metadata type and storage key helper.
2. Sanitize repeatable metadata in parsed/created queue jobs.
3. Extend replay request draft builder for repeatable groups.
4. Add harness coverage for valid and incomplete repeatable jobs.
5. Run focused checks and full gate.

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

- Repeatable metadata survives queue job creation and parsing.
- Invalid repeatable metadata is dropped.
- Complete repeatable jobs produce a manual replay request draft matching `buildAddRepeatableGroupPayload`.
- Incomplete repeatable jobs return explicit missing keys.
- Existing single-field queue behavior stays covered.

## Risks and recovery strategy

- Risk: repeatable jobs could be mistaken for executable replay. Mitigation: no execution path is added.
- Risk: field names could drift from the add form. Mitigation: harness uses the existing `field:<key>` value shape.
- Risk: legacy jobs remain incomplete. Mitigation: missing metadata stays explicit.

## Status/progress notes

- 2026-06-21: Planned, implemented, and verified.
