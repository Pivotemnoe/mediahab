# UI Phase 12C.4 - Visible Retention and Safe Cleanup

## Status

Implemented and accepted locally on 2026-08-01. Production cleanup remains disabled and production is unchanged until separately approved by the owner.

## Goal

Make storage finite and understandable without making History look broken. Uploaded photo and future video originals receive a visible 30-day availability date. Active-workspace text receives a 180-day planning horizon. Cleanup is workspace-scoped, observable, idempotent, and uses a warning and recoverable grace state before permanent byte deletion. External published posts are never touched.

## Decisions

1. The default pilot policy is 30 days for image/video originals, 180 days for text, a warning seven days before media expiry, and a seven-day recoverable media grace period after expiry.
2. Raw voice remains a separate unresolved policy. Audio and voice are excluded from automated cleanup unless an owner later sets an explicit raw-voice period. The Notebook's provisional timestamp remains informational and does not authorize physical cleanup.
3. `retention_until` is the user-visible original-media availability date. After it, History shows an intentional expired/grace placeholder instead of a broken object URL.
4. A workspace policy and candidate queue are persisted. Repeated scans update the same candidate instead of duplicating it.
5. The scanner may warn, place media in grace, or mark it ready. Permanent object deletion requires both an enabled workspace policy and an explicit owner execution request. The default is disabled.
6. Text candidates are reported and queued after 180 days, but destructive text cleanup stays blocked until export and reference-safe deletion are implemented and explicitly enabled. Revisions, publication evidence, outbox rows, audit records, and backups are not altered by this slice.
7. Inactivity policy is reported as 90 days plus a 30-day recovery/export grace period. This slice does not send external notifications or delete inactive workspace data.
8. No optional compressed archive is created until real storage/compression/restore economics are measured.
9. Returning, updating content, or an explicit retain action cancels a pending text candidate for that content item.

## Data and migration

- Add one versioned `retention_policies` row per workspace.
- Add idempotent `retention_candidates` scoped by workspace, object type, and object ID, with expiry, warning, grace, status, attempts, audit timestamps, and safe metadata.
- Index candidate status/dates and media `retention_until` for bounded scans.

## API and UI

- GET workspace retention summary with policy, byte/count totals, next expiry, warnings, blockers, and cleanup-disabled posture.
- POST workspace scan in dry-run or persisted-queue mode; owner/admin only for persisted changes.
- POST retain/cancel for one candidate.
- POST execute-ready for owner-only media byte cleanup, rejected while cleanup is disabled.
- Include exact retention date and lifecycle state in media responses.
- Show the 30-day rule and exact earliest date in the existing simple composer; add a storage summary to the existing Settings page. No new product screen.

## Tests

- Workspace isolation and role checks.
- Image/video receive 30-day expiry; voice remains excluded.
- Seven-day warning, grace, ready transitions, no duplicate candidates, and cancellation/retain behavior.
- Disabled cleanup rejects execution and performs no object deletion.
- Text candidates do not mutate content, revisions, variants, publication evidence, or external posts.
- Mobile 390 px and desktop 1440 px summary/composer copy has no horizontal overflow.

## Risks and rollback

- Object deletion cannot be undone after grace. It remains disabled by default and needs a later production approval plus verified backups/export.
- Database and object-store drift can leave metadata without bytes. Execution records attempts and keeps an explicit expired placeholder.
- Rollback removes the policy/candidate tables, endpoints, UI summary, and automatic image/video timestamps. Existing media metadata and all content/publication data remain.

## Verification result

- New image/video uploads receive a 30-day ISO expiry and visible lifecycle state. Raw voice remains `policy_pending` and is excluded from cleanup while its period is unset.
- Dry-run writes nothing. Persisted scans are workspace-scoped and idempotent; warning/grace/ready and retain/cancel behavior are covered by three focused API tests.
- Execution returns `409 retention_cleanup_disabled` by default and leaves the media readable. Text candidates are report-only and do not mutate the `ContentItem`.
- The full suite passes 97 API tests; lint, TypeScript/Python type checks, OpenAPI export, and PostgreSQL Alembic upgrade through revision `202606200011` pass.
- The existing Settings page showed 30/180-day rules, blockers, byte/count totals, and cleanup-disabled posture at 390 px and 1440 px without horizontal overflow.
- The existing simple composer showed the 30-day original-media rule at 390 px without horizontal overflow. Exact earliest expiry appears after upload or when reopening attached media.
- No production connection, data, object, external post, deployment, or cleanup job was changed or run.
