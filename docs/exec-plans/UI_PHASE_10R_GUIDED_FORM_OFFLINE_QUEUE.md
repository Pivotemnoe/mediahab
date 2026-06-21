# UI Phase 10r — Guided Form Offline Queue Posture

## Objective

Add the first local offline queue posture for guided-form single field saves: when autosave or manual save fails, the visible field values should be stored as an unsynced browser-local job with Russian status and a manual retry control.

## Non-Goals

- Do not implement background sync scheduler, service worker queue replay, merge tooling, live recording, STT upload, media upload, AI assembly, or publication approval.
- Do not auto-create repeatable group rows while the user types.
- Do not change backend routes, database schema, migrations, provider settings, or generated OpenAPI.
- Do not enable fixture mutations.
- Do not store secrets, tokens, cookies, hidden versions, or platform credentials in browser storage.

## Current-State Findings

- UI Phase 10q added debounced autosave for single guided-field forms.
- UI Phase 10p added browser-local draft recovery for visible field values.
- Failed autosave currently leaves values in draft storage, but there is no explicit unsynced-job status or retry affordance.
- Repeatable group creation remains manual and should not be queued automatically in this slice.

## Assumptions And Open Questions

- The local queue should store only visible user-entered values, plus non-sensitive error metadata and timestamp.
- Successful single-field save clears the local queue job.
- `version_conflict` and CSRF/session failures still require refresh; the queued value stays visible as unsynced context, but the recovery action remains refresh.
- Generic/API unavailable failures should offer manual retry through the existing server action.

## Files And Modules

- Update `apps/web/src/components/phase04/guided-form-actions.tsx` with scoped local queue helpers and queue status UI for single field forms.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting frontend client-component/docs changes.

## Security And Tenancy Impact

No secrets or auth material are stored. Local queue jobs contain only the same factual text visible in the guided-form controls and non-sensitive error status metadata. Backend remains the authority for workspace access, roles, validation, fact locks, and optimistic version checks.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent and should verify queue controls are disabled/absent in fixture mode. Live retry testing requires a running backend and authenticated browser session.

## Implementation Order

1. Add scoped queue serialization/restoration for single guided-field forms.
2. Save an unsynced queue job when a single-field server action returns warning/danger.
3. Clear the queue job after successful save.
4. Render a Russian queue status line with manual retry for retry-safe failures.
5. Preserve local draft recovery, autosave status, manual lock/save, repeatable manual creation, and fixture-mode disabled behavior.
6. Run typecheck, lint, web build, visual smoke, spec validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Single guided-field forms show an offline queue status line.
- Fixture/read-only mode shows queue unavailable and does not write local queue jobs.
- Failed single-field action states can store an unsynced local queue job.
- Retry-safe queued jobs expose a manual retry control using the existing server action.
- Repeatable group creation stays manual and is not autosynced or queued.
- No backend schema, migration, OpenAPI, AI, STT, S3, or social connector behavior changes.

## Risks And Recovery

- This is still a local queue posture, not durable background sync. A later slice should move from browser-only queue state to explicit service-worker/background sync behavior if long offline sessions are in scope.

## Status

- 2026-06-21: Started after UI Phase 10q.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
