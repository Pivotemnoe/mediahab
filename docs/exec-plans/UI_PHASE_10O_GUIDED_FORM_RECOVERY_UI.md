# UI Phase 10o — Guided Form Recovery UI

## Objective

Turn the guided-form inline error state into an explicit recovery UX: when a mutation fails because of version conflict, CSRF/session issues, or API availability, the form should show the next safe user action in Russian instead of leaving the user with a passive message.

## Non-Goals

- Do not implement debounced autosave, offline queue, merge tooling, live recording, STT upload, media upload, AI assembly, or publication approval.
- Do not change backend routes, database schema, migrations, provider settings, or generated OpenAPI.
- Do not enable fixture mutations.
- Do not solve split-domain cookie strategy in application code before deployment strategy is confirmed.

## Current-State Findings

- UI Phase 10n added typed action state and Russian inline messages for guided-form server actions.
- `version_conflict` currently tells the user to refresh, but there is no visible recovery control.
- CSRF/session failures and API unavailability need a concrete retry/refresh path in the form surface.
- Fixture mode already renders status slots and keeps mutation buttons disabled.

## Assumptions And Open Questions

- `version_conflict`, `csrf_required`, and `csrf_invalid` should offer a page refresh because local hidden version/CSRF inputs may be stale.
- API unavailable and generic backend rejection should offer a retry affordance by leaving the original submit buttons available when the form is otherwise mutable.
- A small client-only recovery action is enough for this slice. Server-side merge or latest-version preview remains a later slice.

## Files And Modules

- Extend `apps/web/src/services/guided-action-state.ts` with a typed recovery action.
- Update `apps/web/src/services/content-actions.ts` to classify recovery actions for success/error states.
- Update `apps/web/src/components/phase04/guided-form-actions.tsx` to render Russian recovery controls and keep fixture mode disabled.
- Add Russian report after implementation.

## Database Migration And Rollback

No migration. Rollback is reverting frontend action-state/component/docs changes.

## Security And Tenancy Impact

No credentials or tokens are exposed. Refresh/retry controls keep all mutations behind existing server actions, cookies, CSRF forwarding, and backend workspace authorization.

## External API And Live-Test Prerequisites

Fixture visual smoke remains backend-independent. Live conflict/CSRF testing requires a running backend and authenticated browser session.

## Implementation Order

1. Add `recoveryAction` to guided action state.
2. Classify version/CSRF errors as `refresh`, generic/API availability errors as `retry`, and success as `none`.
3. Render an inline recovery footer with `Обновить страницу` or `Повторить сохранение` guidance.
4. Preserve fixture-mode disabled mutation controls and status slot visibility.
5. Run typecheck, lint, web build, visual smoke, spec validation, and diff checks.

## Tests And Commands

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke for `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Acceptance Evidence

- Guided-form action state includes typed recovery metadata.
- Version/CSRF failures can render an explicit refresh action.
- API unavailable/generic failures can render a retry hint while submit buttons remain the retry mechanism.
- Fixture mode still keeps mutation buttons disabled and renders the reserved status area.
- No backend schema, migration, OpenAPI, AI, STT, S3, or social connector behavior changes.

## Risks And Recovery

- This is still a recovery prompt, not a merge workflow. If live testing shows frequent conflicts, a later slice should fetch latest item metadata and support preserving local edits across refresh.

## Status

- 2026-06-21: Started after UI Phase 10n.
- 2026-06-21: Implemented; typecheck, lint, build, visual smoke, whitespace check, and spec validation passed.
