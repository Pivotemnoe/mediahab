# UI Phase 07 — Integrations And Publications

## Objective

Upgrade `/app/integrations` and `/app/publications` to the UI roadmap target: Telegram/MAX/Instagram cards, connection states, capabilities, publication queue, partial success, retry/cancel, and schedule modal posture.

## Non-Goals

- No live connector activation or credential handling.
- No real webhook delivery, SSRF live controls, or challenge flow.
- No backend route/model changes.
- No calendar/media/example library work; UI Phase 08 owns that.

## Current-State Findings

- `/app/integrations` is a compact technical provider map.
- `/app/publications` renders `PublicationCoreShell` with technical Phase 06/09 publication contract details.
- Canonical UX requires connection state cards, capabilities, partial publication success, retry/cancel actions, and schedule modal posture.

## Assumptions And Open Questions

- Fixture data is acceptable until real connector status API wiring is added.
- Generic webhook live controls stay disabled/posture-only until SSRF, DNS, egress, signing, verification, timeout, rate-limit, audit and kill-switch controls are implemented and tested.
- Publication actions must be framed as review/queue operations, not guaranteed live publication.

## Files And Modules

- Add `apps/web/src/features/publication-ops/publication-ops-fixtures.ts`.
- Update `apps/web/src/app/app/integrations/page.tsx`.
- Update `apps/web/src/components/phase06/publication-core-shell.tsx`.
- Add Russian UI Phase 07 report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend/docs changes.

## Security And Tenancy Impact

No secrets in frontend fixtures. Live webhook activation remains owner/admin and disabled posture only.

## External API And Live-Test Prerequisites

None.

## Implementation Order

1. Add this execution plan.
2. Add publication/integration fixture data.
3. Upgrade integrations page.
4. Upgrade publications shell.
5. Run typecheck, lint, build, screenshots, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke `/app/integrations` and `/app/publications` at 390/768/1280/1440 px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Integrations page shows Telegram/MAX/Instagram/Webhook state, account/channel, permissions, token posture, capabilities, test/reconnect/disable actions.
- Publications page shows queue, partial success, attempts, retry/cancel, schedule posture, manual export and independent destination statuses.
- Typecheck/build pass.

## Risks And Recovery

- Static fixture states must be replaced with real connector status and publication APIs later.
- Keep operations UI action labels conservative to avoid implying live publication readiness.

## Status

- 2026-06-20: Started after UI Phase 06 commit and push.
