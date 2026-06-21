# UI Phase 10w — Guided Queue Replay Readiness

## Objective

Add an explicit guided-form queue replay readiness boundary so the app shell can explain why queued browser-local saves are manual retry jobs today, and future service-worker/background replay cannot be enabled accidentally without satisfying HttpOnly cookie, CSRF, version-conflict, and authenticated API-mode prerequisites.

## Non-Goals

- Do not implement automatic service-worker replay or Background Sync.
- Do not call backend APIs from the browser-local queue layer.
- Do not change backend routes, database schema, migrations, OpenAPI, or generated API clients.
- Do not enable fixture mutations.
- Do not store cookies, CSRF tokens, bearer tokens, connector credentials, or platform secrets in browser storage.
- Do not add live STT, recording upload, media upload, AI assembly, or publication approval.

## Current-State Findings

- UI Phase 10v added `guided-queue-store.ts` and made the app shell count only valid queued jobs.
- The app shell still phrases online queued jobs as "open the material and retry", but that policy is embedded directly in `OfflineStatus`.
- Static `public/sw.js` handles only GET shell caching. It has no source-module imports and no safe mutation replay path.
- Real replay needs authenticated API mode, HttpOnly cookie availability, CSRF forwarding strategy, and conflict handling. These are not safe to infer from localStorage alone.

## Assumptions And Open Questions

- Until split-domain cookie/CSRF strategy and live API-mode smoke are complete, guided-form queue replay remains manual form retry.
- A client-safe policy/readiness module under `apps/web/src/services/` is the right place to keep replay mode and Russian shell copy together.
- The app shell may display aggregate queue count and replay policy, but must not expose queued field values.

## Files And Modules

- Add `apps/web/src/services/guided-queue-replay.ts`.
- Update `apps/web/src/components/pwa/offline-status.tsx` to derive queue banner text from replay readiness.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting the frontend service/UI copy changes and documentation files.

## Security And Tenancy Impact

No server-side tenancy behavior changes. This slice reduces replay risk by making the current mode explicit: background mutation replay is disabled until authenticated API-mode and CSRF preconditions are proven.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent. Live API-mode autosave/conflict/retry testing is still required before enabling automatic replay.

## Implementation Order

1. Add replay readiness helper with explicit statuses and non-sensitive reason codes.
2. Update `OfflineStatus` to list valid queue entries and render readiness-derived Russian copy.
3. Keep offline and online queue states visible without queued field content.
4. Add Russian report and run the standard checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- `OfflineStatus` no longer owns guided queue replay policy copy.
- Replay readiness always reports `canAutoReplay=false` for queued guided-form jobs in this slice.
- Online queued shell copy says automatic replay is disabled and directs the user to manual retry in the material.
- Offline shell copy still explains that AI and publications are unavailable.
- Fixture visual smoke still shows status slots, fixture mutation controls remain disabled, and there is no horizontal overflow.

## Risks And Recovery

- Risk: user-facing shell copy becomes more explicit about an unfinished automatic replay feature. This is intentional for technical UX and avoids a false production claim.
- Risk: future replay implementers may bypass this policy module. Mitigation: document it as the current readiness boundary and keep it imported by the app shell.

## Status

- 2026-06-21: Started after UI Phase 10v.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
