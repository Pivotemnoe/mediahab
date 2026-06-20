# UI Phase 10 — Hardening

## Objective

Add practical UI hardening without new dependencies: app-level loading/error states, visible offline badge, Russian UI copy pass, smoke screenshot evidence, and hardening report.

## Non-Goals

- No full real API client migration.
- No new Playwright dependency.
- No screenshot regression framework.
- No backend route/model changes.

## Current-State Findings

- `PwaRuntime` already tracks online/offline state in `documentElement.dataset.connection`.
- No visible offline badge exists.
- No `/app/loading.tsx` or `/app/error.tsx` app-level states exist.
- Prior UI phases already ran Chrome DevTools Protocol screenshot smoke across responsive widths.
- Several fixture screens still exposed English operational labels even though the product UI must be Russian.

## Assumptions And Open Questions

- Chrome DevTools Protocol smoke is acceptable for this local pass because Playwright is not installed in the workspace.
- Real API contracts and screenshot regression should be a follow-up integration/hardening task.

## Files And Modules

- Add `apps/web/src/components/pwa/offline-status.tsx`.
- Update `apps/web/src/components/layout/shells.tsx`.
- Add `apps/web/src/app/app/loading.tsx`.
- Add `apps/web/src/app/app/error.tsx`.
- Update visible UI copy in app/marketing fixtures and screens to Russian while keeping technology names such as Telegram, MAX, Instagram, OpenAI, S3, CSRF and RLS.
- Add Russian UI Phase 10 report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend/docs changes.

## Security And Tenancy Impact

No security-sensitive backend changes. Error UI must not expose stack traces.

## External API And Live-Test Prerequisites

None.

## Implementation Order

1. Add this execution plan.
2. Add offline badge.
3. Add loading/error states.
4. Run a Russian UI copy pass for visible fixture/screen text.
5. Run typecheck, lint, build, representative screenshots, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke representative app routes at 390/768/1280/1440 px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- App shell has visible offline state.
- `/app` segment has loading and error boundary UI.
- Error UI does not show stack traces.
- Representative app routes no longer expose the old English UI labels checked during CDP smoke.
- Typecheck/build pass.

## Risks And Recovery

- This is not a replacement for full Playwright regression coverage.
- Offline badge is runtime-only and should later connect to queued draft/action state.

## Status

- 2026-06-20: Started after UI Phase 09 commit and push.
- 2026-06-20: Added offline/loading/error hardening and Russian UI copy pass for visible fixture screens.
