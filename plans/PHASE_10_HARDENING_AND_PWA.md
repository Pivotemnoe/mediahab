# Phase 10 — Calendar, hardening, and PWA

## Objective

Make the pilot resilient enough for daily use and prepare tenant isolation and operations for public SaaS exposure.

## Deliverables

- Calendar, workspace timezone, schedule/cancel/reschedule flows.
- PostgreSQL RLS policies and tests in addition to application authorization.
- Service worker, installability, update flow, offline draft queue/reconciliation, and storage-pressure behavior.
- Monitoring, alerting, structured audit review, health dashboards, log retention, and connector diagnostics.
- Database/object-storage backup policy, encrypted backups, restore drill, disaster runbook.
- Security, performance, concurrency, and publication-recovery tests.
- Data retention/deletion jobs and workspace export/deletion workflow, using the provisional owner direction recorded in `docs/en/IMPLEMENTATION_PLAN.md`: 30-day original-media availability, up to 180 days for active-workspace text, an inactivity warning/grace path, visible expiry dates, export before cleanup, and separately confirmed raw-voice retention.
- Storage lifecycle metrics for original media versus an optional short compressed-preview/archive tier; no indefinite archive by default.

## Acceptance

- PWA passes the defined install/offline/update scenarios on supported mobile browsers.
- Restore drill is documented and successfully executed in staging.
- RLS denies representative cross-workspace access even if an application query is missing a filter.
- A worker restart during publication produces neither loss nor duplicate external posts.
- Retention dry-run and cleanup acceptance prove that only expired workspace-owned objects are selected, external published posts remain untouched, users receive the documented warning/grace period, and repeated cleanup is idempotent.
