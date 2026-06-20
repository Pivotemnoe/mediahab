# Phase 10 — Scheduling, Calendar, And Hardening

## Objective

Harden publication scheduling for the pilot: normalize scheduled publication times to UTC using workspace timezone, support rescheduling and cancellation of durable outbox jobs, verify worker restart idempotency, and document the remaining RLS/PWA/backup production controls without pretending they are fully complete.

## Non-Goals

- Full PostgreSQL RLS deployment in the SQLite-based local test harness.
- Complete offline draft queue/reconciliation for the mobile PWA.
- Production monitoring vendor integration.
- Real backup encryption and restore execution against a staging database.
- Command Center dark operations UI.

## Current-State Findings

- Workspaces already store `timezone`.
- Publications already support `schedule`, `cancel`, `retry`, and outbox events.
- Scheduled publication stores UTC-like datetimes but does not explicitly normalize naive local input by workspace timezone.
- There is no explicit reschedule endpoint.
- Cancellation marks pending outbox events completed, but tests need to cover scheduled cancellation and duplicate-prevention after restart.
- `/app/calendar` is a technical placeholder and can reflect scheduling states without becoming a full calendar product UI.

## Assumptions And Open Questions

- API callers may send either timezone-aware `scheduled_at` or naive local `scheduled_at` plus workspace timezone context.
- For Phase 10, the workspace timezone is the source of truth when a schedule timestamp is naive.
- Public SaaS remains blocked until actual PostgreSQL RLS policies, backup restore drill, and PWA offline scenarios are executed outside the local SQLite harness.

## Files And Modules

- Extend `services/api/app/modules/publications/service.py` with schedule-time normalization and reschedule support.
- Extend `services/api/app/api/v1/routes/publications.py` with `POST /publications/{publication_id}/reschedule`.
- Add publication-core tests for timezone normalization, reschedule/cancel, and restart idempotency.
- Update `tools/e2e_smoke.py` if a public route is added.
- Update `/app/calendar` technical copy.
- Add operations/RLS/PWA notes as documentation and update open questions.

## Database Migration And Rollback

No migration is planned. Existing `publications.scheduled_at` and `outbox_events.available_at` fields are reused.

## Security And Tenancy Impact

- Reschedule uses the same delivery role checks as schedule/publish.
- RLS remains a production hardening dependency; this phase documents and tests app-level representative isolation but does not claim database-level RLS is complete.

## Implementation Order

1. Add this execution plan.
2. Normalize schedule timestamps to UTC, using workspace timezone for naive input.
3. Add reschedule service and API endpoint.
4. Ensure cancellation completes pending scheduled outbox jobs.
5. Add tests for timezone, reschedule/cancel, and restart idempotency.
6. Update calendar shell, e2e smoke, report, and open questions.
7. Run focused and full verification.

## Tests And Commands

- `.venv/bin/python -m unittest services.api.tests.test_publication_core -v`
- `make openapi`
- `make typecheck`
- `make lint`
- `make test`
- `make test-e2e`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Naive schedule timestamps are stored in UTC according to workspace timezone.
- Rescheduling updates both publication `scheduled_at` and the pending outbox `available_at`.
- Cancelling a scheduled publication completes pending publish outbox events.
- Re-processing after a successful publish does not duplicate external posts.

## Risks And Recovery

- RLS, backup restore, and full PWA offline behavior still need environment-specific execution.
- DST-sensitive behavior must be rechecked when real user timezone selection UI is implemented.

## Status

- 2026-06-20: Started after Phase 09 Instagram commit and push.
- 2026-06-20: Implemented scheduling normalization, reschedule API, PWA runtime shell, calendar shell update, and focused/full checks through `make validate-spec` and `git diff --check`.
