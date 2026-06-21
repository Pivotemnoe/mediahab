# UI Phase 10s — Guided Queue App Status

## Objective

Connect the guided-form local queue posture to the app shell: the PWA/offline status should surface how many guided-form saves are waiting in this browser, while keeping queue replay manual and inside the content form.

## Non-Goals

- Do not implement service-worker background sync, automatic queue replay, merge tooling, live recording, STT upload, media upload, AI assembly, or publication approval.
- Do not change backend routes, database schema, migrations, provider settings, or generated OpenAPI.
- Do not enable fixture mutations.
- Do not store secrets, tokens, cookies, hidden versions, or platform credentials in browser storage.

## Current-State Findings

- `OfflineStatus` already renders a visible PWA shell status when the browser is offline.
- UI Phase 10r stores guided-form queue jobs under `tmh:guided-form-queue:v1:*`.
- Queue jobs are currently visible only inside the individual guided field form.
- Browser `storage` events do not fire in the same tab that writes localStorage, so a local custom event is needed for same-tab app shell updates.

## Assumptions And Open Questions

- App shell status should show queued guided-form jobs both online and offline, because online retry may still require user action after API errors or conflicts.
- The app shell should not expose queued text content, only job counts.
- The local form remains the only place that can retry a specific guided-field job in this slice.

## Files And Modules

- Update `apps/web/src/components/phase04/guided-form-actions.tsx` to emit a local queue event after queue writes/clears.
- Update `apps/web/src/components/pwa/offline-status.tsx` to count guided-form queue jobs and render Russian status.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting frontend client-component/docs changes.

## Security And Tenancy Impact

The app shell reads only localStorage keys and counts jobs. It does not display factual field text, credentials, tokens, cookies, or backend metadata beyond an aggregate count.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent. Live queue count testing requires API mode or manually seeded localStorage in the browser.

## Implementation Order

1. Add a shared local event name for guided-form queue changes.
2. Emit the event when queue jobs are written or cleared.
3. Count `tmh:guided-form-queue:v1:*` keys in `OfflineStatus`.
4. Render shell status when offline or when queued guided-form jobs exist.
5. Run typecheck, lint, web build, visual smoke, spec validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- App shell can show guided-form queue count without exposing queued content.
- Offline status still appears when the browser is offline.
- Fixture mode with no queued jobs does not render the app-shell queue banner.
- No backend schema, migration, OpenAPI, AI, STT, S3, or social connector behavior changes.

## Risks And Recovery

- This is an app-shell indicator, not a queue replay engine. A later slice should add explicit background sync behavior if product requirements demand automatic replay.

## Status

- 2026-06-21: Started after UI Phase 10r.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
