# UI Phase 10n — Guided Form Error UI

## Objective

Add inline status and error UI for guided-form server actions in Content Studio, replacing raw action exceptions with typed action state and Russian user-facing messages for common backend failures.

## Non-Goals

- Do not implement debounced autosave, offline queue, merge tooling, live recording, STT upload, media upload, AI assembly, or publication approval.
- Do not change backend routes, database schema, migrations, provider settings, or generated OpenAPI.
- Do not enable fixture mutations.
- Do not add split-domain cookie behavior before deployment strategy is confirmed.

## Current-State Findings

- UI Phase 10m added server actions for guided-form saves and repeatable-group creation.
- Current actions throw raw exceptions on missing CSRF, API errors, version conflicts, and network failures.
- `ContentStudioShell` renders server-action forms directly, so there is no persistent inline action result area.
- Backend errors use the canonical envelope `{ "error": { "code", "message", "details", "request_id" } }`.

## Assumptions And Open Questions

- A small client component around each mutation form is enough for this slice; the surrounding Content Studio remains server-rendered.
- `409 version_conflict` should tell the user to refresh before editing again. Full merge/conflict resolution remains a later slice.
- CSRF errors should be explicit and conservative, because they may indicate an expired session or split-domain cookie problem.
- Fixture mode keeps controls disabled but still renders a reserved status slot for visual smoke.

## Files And Modules

- Extend `apps/web/src/services/runtime.ts` to parse backend error envelopes.
- Update `apps/web/src/services/content-actions.ts` to return typed action state instead of throwing user-visible failures.
- Add a client mutation form component for guided-form save/add actions.
- Update `apps/web/src/components/phase04/content-studio-shell.tsx` to use the client component and keep fixture mode disabled.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting frontend runtime/actions/component/docs changes.

## Security And Tenancy Impact

No secrets or credentials are added. Mutations still forward HttpOnly cookies and CSRF from the server side, and backend remains the authority for workspace access, roles, validation, fact locks, and optimistic version checks.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent. Live error testing requires a running backend and authenticated browser session. Split-domain deployments still require a cookie/domain decision for Next server actions and backend CSRF.

## Implementation Order

1. Parse canonical backend error envelopes in `apiRequest`.
2. Add action-state types and Russian message mapping for `csrf_required`, `csrf_invalid`, `version_conflict`, and API availability failures.
3. Move guided-form mutation forms into a client component using `useActionState` and inline `aria-live` status areas.
4. Preserve fixture-mode disabled controls and add visible reserved status space.
5. Run typecheck, lint, web build, visual smoke, spec validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Guided-form forms return typed action state instead of raw exceptions.
- Inline Russian status/error area is visible in fixture smoke and can display save success, CSRF failure, version conflict, validation/API errors, and API unavailable.
- Fixture mode keeps mutation buttons disabled.
- No backend schema, migration, OpenAPI, AI, STT, S3, or social connector behavior changes.

## Risks And Recovery

- `useActionState` introduces a small client boundary inside Content Studio. Keep the boundary scoped to mutation forms only.
- Version-conflict UI is informational in this slice; actual merge/reload workflow should follow later.

## Status

- 2026-06-21: Started after UI Phase 10m.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
