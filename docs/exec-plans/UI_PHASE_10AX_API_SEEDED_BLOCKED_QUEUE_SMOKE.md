# UI Phase 10ax — API-mode seeded blocked queue smoke

## Objective and non-goals

Objective: add and run a reproducible browser smoke that verifies a real API-mode Content Studio page renders a seeded blocked repeatable guided-form queue job with the refresh recovery surface.

Non-goals:

- Do not enable automatic replay or background sync.
- Do not execute queued mutations from the browser.
- Do not implement merge UI for `version_conflict`.
- Do not change user-visible UI copy, backend product routes, OpenAPI, database schema, migrations, generated clients, AI, STT, media upload, or publication behavior.
- Do not persist test credentials, cookies, queued values, or screenshots in the repo.

## Current-state findings

- UI Phase 10av added `Обновить страницу` for blocked refresh-required queue jobs.
- UI Phase 10aw added stable queue DOM hooks and recovery button test ids.
- Existing `tools/check_guided_form_api_mode.py` proves the backend can create a real content item and that stale repeatable group writes return `version_conflict`.
- What is still missing is browser evidence that a real API-mode guided form reads a seeded repeatable queue job from localStorage and renders the blocked/refresh surface.

## Assumptions and unresolved questions

- The smoke can use a temporary SQLite database and local HTTP FastAPI server.
- The smoke can set non-secure local cookies because it runs against `http://127.0.0.1` only.
- The smoke should seed only non-sensitive sample queue values and must not store screenshots in the repository.
- Split-domain production cookie strategy remains unresolved; this smoke validates local same-host API-mode behavior only.

## Files/modules to change

- Add a reusable local API smoke server helper under `tools/`.
- Add an API-mode browser seeded smoke tool under `tools/`.
- Add a Russian owner report after implementation.

## Database migrations and rollback notes

No migrations. Rollback is code-only: remove the smoke helper/tool and report.

## Security and tenancy impact

The smoke creates a temporary SQLite database and local-only user/session. Cookies and seeded localStorage values stay inside the temporary browser profile. No secrets or production endpoints are used.

## External API/live-test prerequisites

None.

## Step-by-step implementation order

1. Add a Python helper that starts the FastAPI app with the existing schema on a temporary SQLite database.
2. Add a Node smoke that starts the helper, registers a local user through HTTP, imports the food preset, creates content, starts Next in API mode, seeds the repeatable queue localStorage key, and verifies the blocked queue DOM surface in headless Chrome.
3. Save local screenshots under `/private/tmp`.
4. Run focused smoke and full local gates.

## Tests and checks

- `node tools/check_guided_queue_api_seeded_smoke.mjs`
- `make test-ui-hardening`
- `make test`
- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- Visual smoke on `/app/content/demo-review` at 390px and 1440px
- `make validate-spec`
- `git diff --check`

## Demo/acceptance evidence

Acceptance evidence should show:

- A real API-mode Content Studio page renders `data-guided-queue-status="blocked"`.
- The blocked queue has `data-guided-queue-kind="repeatable_group"` and `data-guided-queue-recovery="refresh"`.
- `guided-queue-refresh` is visible and `guided-queue-retry` is absent for the refresh-required job.
- Existing fixture-mode visual smoke remains green.

## Risks and recovery strategy

- Risk: local ports collide. Mitigation: the smoke allocates free ports dynamically.
- Risk: Next rewrites `next-env.d.ts`. Mitigation: restore it after build/dev before committing.
- Risk: smoke becomes slow. Mitigation: keep it focused on one seeded content item and two screenshots.

## Status/progress notes

- 2026-06-22: Started after UI Phase 10aw.
- 2026-06-22: Implemented local API smoke server helper and API-mode browser seeded smoke.
- 2026-06-22: Full local gate, API-mode seeded smoke, and fixture visual smoke completed; ready to commit.
