# UI Phase 10bc — Guided Queue Confirmation Shell

## Objective

Add a small, explicit confirmation shell around guided-form local queue retry controls. The shell must make manual retry intent visible before a saved queue job triggers the current form submit path, while keeping automatic replay/background sync disabled and never rendering queued field values.

## Context

- UI Phase 10bb added safe replay preflight for guided queue jobs.
- `buildGuidedQueueReplayRequestDraft` can classify a stored job and prepare a request draft, but the UI still uses the existing manual form-submit retry path.
- HttpOnly cookie and CSRF forwarding remain server-action concerns; this slice must not add direct browser API replay.

## Assumptions

- Fixture mode remains non-mutating and unavailable for guided queue retries.
- API mode may show retry controls only when the current form is mutable and the queue job does not require page refresh.
- `version_conflict` / `recoveryAction=refresh` remains refresh-only; no retry confirmation is shown there.
- Confirmation copy is Russian and intentionally avoids queued values.

## Implementation Plan

1. Add local confirmation state to `QueueStatusLine`.
2. Replace immediate retry click with a two-step shell:
   - first click opens a confirmation prompt with route/status context;
   - confirm click calls the existing `onRetry` callback;
   - cancel closes the prompt.
3. Add DOM hooks for hardening and visual smoke:
   - `data-guided-queue-retry-shell`;
   - `data-testid="guided-queue-retry-arm"`;
   - `data-testid="guided-queue-retry-confirm"`;
   - `data-testid="guided-queue-retry-cancel"`.
4. Update source-level hardening checks.
5. Extend the seeded API smoke to exercise the confirmation shell on a retry-safe queued field job, while preserving the existing refresh-only repeatable conflict check.

## Tests

- `node tools/check_guided_queue_replay_preflight.mjs`
- `make test-ui-hardening`
- `node tools/check_guided_queue_api_seeded_smoke.mjs`
- `make test`
- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- visual smoke `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Risks

- Confirmation state can become stale if a queue job is cleared or replaced. Mitigation: reset confirmation state on queue job/status changes.
- Tests must not assert real replay execution unless the backend mutation path is explicitly in scope.
- The prompt must not leak queued values through labels, screenshots, or console output.

## Rollback

Revert the UI confirmation shell and related test additions. Existing queue preflight and manual retry behavior from UI Phase 10bb can remain intact.

## Status

- 2026-06-22: Started after UI Phase 10bb because public domain deployment is still blocked by HTTPS/TLS and server access.
- 2026-06-22: Implemented confirmation shell, updated hardening/API-mode smoke, added fixture visual smoke tool, and completed the full local gate.
