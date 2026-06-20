# UI Phase 10b — API Contracts And Service Boundaries

## Objective

Move the UI hardening work from direct fixture imports toward real API contracts by adding a service boundary and `NEXT_PUBLIC_DATA_MODE=api | fixtures` support for the dashboard and publication operations screens.

## Non-Goals

- Do not replace every feature screen in one step.
- Do not add Playwright or new package dependencies in this subtask.
- Do not implement new backend endpoints.
- Do not make build depend on a running backend.

## Current-State Findings

- `docs/frontend/MOCK_DATA_STRATEGY.md` already defines a feature service boundary and `NEXT_PUBLIC_DATA_MODE=api | fixtures`.
- The web app currently imports rich fixture arrays directly in pages/components.
- Generated OpenAPI JSON exists, but there is no TypeScript service layer around it.
- `/api/v1/me`, `/api/v1/workspaces/{workspace_id}/projects`, `/api/v1/projects/{project_id}/content-items`, `/api/v1/publications`, `/api/v1/publications/{publication_id}/attempts`, `/api/v1/projects/{project_id}/destinations`, `/api/v1/workspaces/{workspace_id}/usage`, and `/api/v1/workspaces/{workspace_id}/subscription` cover a useful first vertical slice.

## Assumptions And Open Questions

- Default data mode remains `fixtures` so `next build` works without a live backend.
- API mode is best-effort until authenticated browser/server cookie forwarding is completed.
- API mode forwards server cookies when available, but full authenticated smoke still requires a running backend and a real session.
- The dashboard can initially map API data to a compact view model, not a complete product analytics model.

## Files And Modules

- Add `apps/web/src/services/runtime.ts`.
- Add `apps/web/src/services/openapi-types.ts`.
- Add `apps/web/src/services/dashboard.ts`.
- Add `apps/web/src/services/publications.ts`.
- Update `/app` dashboard page to use the dashboard service.
- Update `/app/publications` to use the publication operations service.
- Update `PublicationCoreShell` to receive a view model.
- Update frontend mock strategy docs and Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend service and screen wiring changes.

## Security And Tenancy Impact

- No secrets are introduced.
- API mode uses relative OpenAPI paths against a configured base URL and does not store tokens client-side.
- API mode forwards the incoming cookie header server-side when available; it does not persist credentials in browser storage or fixtures.
- Backend remains the source of truth for workspace membership and publication permissions.

## External API And Live-Test Prerequisites

- API mode requires a running backend and authenticated session.
- Fixture mode requires no network.

## Implementation Order

1. Add runtime API helpers and OpenAPI-shaped DTO interfaces.
2. Add dashboard service with fixture fallback and API mappers.
3. Add publications service with fixture fallback and API mappers.
4. Wire dashboard and publication screens to services.
5. Update docs/report.
6. Run typecheck, lint, build, validation, diff checks, and representative visual smoke if needed.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Dashboard and publication pages no longer import feature fixture arrays directly.
- `NEXT_PUBLIC_DATA_MODE=fixtures` keeps local/static build stable.
- `NEXT_PUBLIC_DATA_MODE=api` has typed paths/mappers for the first API-backed slice.
- Checks pass.

## Risks And Recovery

- API mode may show fallback demo data until a live authenticated backend session is available.
- View-model mapping may need deeper entity joins later for destination/platform labels.

## Status

- 2026-06-20: Started after UI Phase 10 hardening commit.
