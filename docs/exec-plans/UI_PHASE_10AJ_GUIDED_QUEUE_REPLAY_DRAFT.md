# UI Phase 10aj — guided queue typed replay draft

## Objective and non-goals

Objective: prepare browser-local guided-form queue jobs for future manual or automatic replay by deriving a typed replay draft from serialized `values` and `fieldTypes`.

Non-goals:

- Do not enable automatic background replay.
- Do not send queued jobs to the backend.
- Do not change backend routes, OpenAPI, database schema, migrations, generated clients, media upload, AI, STT, or publication behavior.
- Do not add final conflict merge UI.
- Do not change fixture mode disabled behavior.

## Current-state findings

- UI Phase 10af-10ah added typed guided action payload mapping for money, boolean, number, rating, select, and multi-select fields.
- UI Phase 10ai made local queue jobs preserve field type metadata as `fieldTypes`.
- `guided-queue-replay.ts` currently reports readiness only; it does not reconstruct typed values from a queued job.
- The existing typed value mapping is private to `guided-action-payloads.ts`, so queue replay cannot reuse it without duplication.

## Assumptions and unresolved questions

- Queue replay draft should be a pure helper with no browser, network, cookie, or CSRF side effects.
- Draft values should retain queue keys as stored:
  - `value` for single-field queued jobs;
  - `field:<key>` for future repeatable-group queued jobs.
- Missing `fieldTypes` should fall back to text values and be reported as `missingFieldTypes` for recovery diagnostics.
- Existing local queue shape stores one string per key. Future multi-select replay may need an array-capable queue value shape before lossless automatic replay.
- Automatic replay remains blocked until cookie/CSRF and version-conflict strategy are explicitly implemented.

## Files/modules to create or change

- Add `apps/web/src/services/guided-action-values.ts` as the shared typed value mapper.
- Update `apps/web/src/services/guided-action-payloads.ts` to reuse the shared mapper.
- Update `apps/web/src/services/guided-queue-replay.ts` with a typed replay draft helper.
- Update Node hardening harnesses so imported service modules are tested without bundling.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: restore the private mapper in `guided-action-payloads.ts`, remove replay draft helper usage and related harness assertions.

## Security and tenancy impact

No secrets, tokens, cookies, CSRF headers, or tenant-scoped backend calls are added. The helper reads browser-local queue job data only and does not transmit it.

## External API/live-test prerequisites

None. Fixture visual smoke remains backend-independent.

## Step-by-step implementation order

1. Extract guided action value typing into a shared service module.
2. Rewire guided action payload builders to use the shared mapper.
3. Add typed queue replay draft construction from `GuidedQueueJob`.
4. Extend hardening harnesses for shared-module imports and replay draft assertions.
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

- Existing guided action payload mapping still produces the same typed API request bodies.
- Queue replay draft converts queued money, rating, select, multi-select, boolean, and text values using stored `fieldTypes`.
- Legacy jobs without `fieldTypes` still produce text fallback and explicit `missingFieldTypes`.
- Replay readiness still keeps `canAutoReplay: false`.
- Fixture mode controls remain disabled and the guided form still renders without horizontal overflow.

## Risks and recovery strategy

- Risk: extracting the mapper changes existing payload semantics. Mitigation: keep the current payload harness assertions and add replay draft assertions.
- Risk: multi-select queued values are not lossless with the current single-string local queue shape. Mitigation: report this limitation and keep automatic replay disabled.
- Risk: future repeatable-group queue keys need a route-level replay envelope. Mitigation: this slice intentionally returns typed draft values only, not a network request.

## Status/progress notes

- Planned: 2026-06-21.
