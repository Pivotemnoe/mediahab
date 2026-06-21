# UI Phase 10al — guided queue request envelope draft

## Objective and non-goals

Objective: prepare single-field guided local queue jobs for future manual replay by storing enough form metadata to derive a typed backend request envelope without submitting it.

Non-goals:

- Do not enable automatic background replay.
- Do not send queued jobs to the backend.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not add final conflict merge UI.
- Do not add durable queue UI for repeatable group creation in this slice.
- Do not change fixture mode disabled behavior.

## Current-state findings

- UI Phase 10aj added typed replay draft construction.
- UI Phase 10ak made local queue values array-capable for lossless `multi_select` replay.
- `GuidedQueueJob` still lacks route metadata such as `contentId`, `fieldKey`, `blockId`, `itemVersion`, `sourceType`, and `intent`.
- `guidedFieldQueueKey` encodes part of the route target, but relying only on the storage key is not enough for a full request body because lock/source/version metadata is missing.
- Button `intent` is provided by the submitter. It is not part of normal form controls after the submit completes unless the UI records it.

## Assumptions and unresolved questions

- Queue job metadata should be browser-local and backward-compatible; old jobs without metadata must still parse.
- This slice targets single-field guided queue jobs only because they are the only durable queue UI currently wired.
- If required metadata is missing, request-envelope helper should return an explicit incomplete status instead of fabricating a backend request.
- Automatic replay remains blocked until cookie/CSRF and version-conflict strategy are explicitly implemented.

## Files/modules to create or change

- Update `apps/web/src/services/guided-queue-contract.ts` with optional single-field metadata.
- Update `apps/web/src/components/phase04/guided-form-actions.tsx` to capture metadata and last submit intent into queue jobs.
- Update `apps/web/src/services/guided-queue-replay.ts` with a pure request-envelope draft helper.
- Extend hardening harnesses for metadata parsing and request-envelope draft behavior.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove queue metadata, request-envelope helper, and related harness expectations.

## Security and tenancy impact

No secrets, tokens, cookies, CSRF headers, authorization behavior, or tenant-scoped backend calls are added. The helper derives a request draft but does not transmit it.

## External API/live-test prerequisites

None. Fixture visual smoke remains backend-independent.

## Step-by-step implementation order

1. Add backward-compatible queue metadata type and parser sanitization.
2. Capture single-field queue metadata from hidden form fields and submit intent.
3. Add pure request-envelope draft construction for complete metadata.
4. Return explicit incomplete reasons for legacy/malformed jobs.
5. Extend harnesses and run full checks.

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

- Queue jobs serialize and parse single-field metadata.
- Old jobs without metadata remain valid.
- Request-envelope helper builds `PATCH /api/v1/content-blocks/:blockId` for existing blocks.
- Request-envelope helper builds `PUT /api/v1/content-items/:contentId/blocks/:fieldKey` for new blocks and includes `version`.
- Missing metadata returns `status: "incomplete"` with concrete missing keys.
- Fixture mode controls remain disabled and the guided form still renders without horizontal overflow.

## Risks and recovery strategy

- Risk: intent capture may be missing for unexpected submit paths. Mitigation: queue metadata records `intent: null`; envelope draft stays incomplete instead of guessing lock semantics.
- Risk: metadata changes localStorage payload shape. Mitigation: parser defaults missing metadata to `null`.
- Risk: request-envelope draft could be confused with replay execution. Mitigation: helper is pure, returns a draft only, and readiness still keeps auto replay disabled.

## Status/progress notes

- Planned: 2026-06-21.
