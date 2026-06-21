# UI Phase 10f — Workspace Settings Service Boundary

## Objective

Extend `NEXT_PUBLIC_DATA_MODE=api | fixtures` service-boundary support to integrations, billing, workspace, and account screens.

## Non-Goals

- Do not implement live credential submission, billing checkout, session revocation, member invitation, or workspace mutation flows.
- Do not expose secrets, tokens, authorization headers, cookies, webhook secrets, or payment provider internals in the UI.
- Do not change backend endpoints, database schema, migrations, or OpenAPI generation.
- Do not add dependencies.

## Current-State Findings

- `/app/integrations` directly used connector fixtures.
- `/app/billing` stored limits, plans, and history inline in the page.
- `/app/workspace` directly used account/workspace fixtures.
- `/app/account` directly used account/session fixtures.
- Backend already exposes useful read endpoints: `/me`, `/me/sessions`, `/workspaces/{workspace_id}/members`, `/workspaces/{workspace_id}/usage`, `/workspaces/{workspace_id}/subscription`, `/plans`, `/billing/payments`, and `/projects/{project_id}/destinations`.

## Assumptions And Open Questions

- API mode can safely use the first workspace and first project until the app has a project/workspace selector state.
- Live mutations remain disabled posture until CSRF and form flows are wired per screen.
- Billing history can use `/billing/payments` for the first slice; invoice display can follow later.

## Files And Modules

- Extend `apps/web/src/services/openapi-types.ts`.
- Add `apps/web/src/services/workspace-settings.ts`.
- Update `/app/integrations`.
- Update `/app/billing`.
- Update `/app/workspace`.
- Update `/app/account`.
- Update mock/service strategy and add Russian report.

## Database Migration And Rollback

No migration. Rollback is reverting frontend service, page wiring, and docs.

## Security And Tenancy Impact

No client-side secrets are added. API mode calls only backend endpoints and still relies on backend session cookies, workspace authorization, and redaction. The UI labels explicitly state that secrets stay on the backend.

## External API And Live-Test Prerequisites

API mode requires a running backend and authenticated browser session. Fixture mode remains the default for local build and visual smoke.

## Implementation Order

1. Add read DTOs for sessions, workspace members, plans, and payments.
2. Add integrations/billing/workspace/account view-model service.
3. Wire the four pages to the service.
4. Keep mutation actions disabled or posture-only.
5. Run typecheck, lint, build, visual smoke, validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/integrations`, `/app/billing`, `/app/workspace`, and `/app/account`
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- The four pages no longer own inline fixture arrays directly.
- Each page shows active data mode.
- Fixture mode still builds without live backend.
- API mode has typed read mappers and safe fixture fallback.
- No UI path exposes or stores credentials.

## Risks And Recovery

- First-workspace/first-project selection is temporary. Add explicit selectors before treating these screens as complete multi-project management.
- Mutations remain unimplemented. Keep action labels honest until live flows exist.

## Status

- 2026-06-21: Started after UI Phase 10e commit and push.
