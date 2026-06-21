# UI Phase 10p — Guided Form Local Draft Recovery

## Objective

Add the first browser-local draft recovery for guided-form mutation forms so a user does not lose typed field values when refreshing after `version_conflict`, CSRF/session recovery, or an interrupted save.

## Non-Goals

- Do not implement server-side debounced autosave, durable offline queue, merge tooling, live recording, STT upload, media upload, AI assembly, or publication approval.
- Do not change backend routes, database schema, migrations, provider settings, or generated OpenAPI.
- Do not enable fixture mutations.
- Do not store secrets, tokens, cookies, or platform credentials in browser storage.

## Current-State Findings

- UI Phase 10o added explicit refresh/retry recovery controls for guided-form action failures.
- Refresh recovery is still lossy for text typed into the current form because fields are uncontrolled and not persisted locally.
- Guided-form mutation forms are already isolated in `guided-form-actions.tsx`, which is the right scoped client boundary for browser-local draft behavior.

## Assumptions And Open Questions

- Local draft storage should only include user-entered guided-form values (`value` and `field:*` controls), not hidden IDs, CSRF, cookies, versions, or backend metadata.
- Drafts should be scoped by content item, field/group key, and block ID where available.
- Successful server action clears the local draft for that form.
- Fixture mode can render local draft status, but disabled/read-only controls must not write browser drafts.

## Files And Modules

- Update `apps/web/src/components/phase04/guided-form-actions.tsx` with scoped localStorage draft helpers.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting frontend client-component/docs changes.

## Security And Tenancy Impact

No secrets or auth material are stored. Local drafts contain only the same factual text the user typed into visible guided-form fields. Backend remains the authority for workspace access, roles, validation, fact locks, and optimistic version checks.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent. Live conflict recovery testing requires a running backend and authenticated browser session.

## Implementation Order

1. Add scoped local draft serialization/restoration for visible guided-form controls.
2. Persist draft values on field input/change when mutation is enabled.
3. Restore draft values after page reload and show Russian inline status.
4. Clear the draft after successful server action.
5. Preserve fixture-mode disabled mutation controls and existing recovery UI.
6. Run typecheck, lint, web build, visual smoke, spec validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Guided-form mutation forms persist visible values to a scoped browser-local draft only when mutation is enabled.
- Page reload can restore those visible values and shows a Russian restored-draft status.
- Successful save/add actions clear the local draft.
- Fixture mode still keeps mutation buttons disabled and does not write local drafts.
- No backend schema, migration, OpenAPI, AI, STT, S3, or social connector behavior changes.

## Risks And Recovery

- Browser-local drafts are not durable publication jobs and not a sync queue. A later slice must add explicit offline queue semantics if the product should survive long offline sessions.

## Status

- 2026-06-21: Started after UI Phase 10o.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
