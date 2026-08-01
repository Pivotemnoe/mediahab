# UI Phase 12A.2 - Full First-Run Project and Rubric Onboarding

## Status

Implemented, locally accepted, and deployed to production on 2026-07-29 as release `20260729-171800-phase12a2` at `https://temichev-posthub.ru`.

Acceptance evidence:

- A new synthetic `example.test` owner registered through the browser and reached a real empty dashboard.
- The owner created two independent Cyrillic-named projects/channels. Automatic project slugs remained unique and the free plan displayed `2 / 3` projects.
- Project-level audience, voice, structure, required guidance, forbidden guidance, humor, CTA, and description persisted and reopened in the rules editor.
- Two general ideal examples and one rubric-specific example were imported, approved, embedded through OpenAI, and listed without fixtures.
- A user-facing rubric was created, remained optional, reopened with its versioned rules, and did not replace the ordinary `Без рубрики` path.
- A publication without a user rubric was created through the hidden versioned project profile. The hidden profile stayed out of rubric lists and visible rubric usage.
- The full AI chain reached OpenAI through the protected NL proxy: embeddings, fact extraction, hook suggestion, master assembly, and Telegram/MAX variants all returned successfully.
- The first run exposed an over-locking defect in the simple composer. The merged source is no longer treated as a verbatim locked fact, so the verified rerun produced a natural edited veterinary post instead of the deterministic fallback.
- Authenticated history and dashboard showed only the two real local materials; no Armavir/demo cards appeared.
- Desktop and 390 × 844 mobile browser checks passed with no browser console errors.
- `make lint`, web typecheck, production web build, `make test` (5 repository tests and 53 API tests), focused 18-test acceptance suite, and `git diff --check` passed.
- The production web container now runs an optimized `next build` artifact through `next start`; it no longer runs `next dev`.
- Production health, readiness, public registration, guest redirect, login, dashboard, project without a user rubric, real history, and material detail passed after the cutover with no browser console errors.
- A synthetic `example.test` production smoke owner created one project, one approved project example, and one material without a user rubric. Embedding, fact extraction, hook, ratings, master assembly, and validated Telegram/MAX variants all completed through the protected NL OpenAI relay.
- PostgreSQL and Redis container IDs did not change. Caddy remained active and the neighbouring site kept its expected HTTP 401 response.

## Objective

Implement the real customer journey:

`public landing -> register/login -> personal dashboard -> create one or more projects/channels -> set project rules and approved examples -> optionally add rubric rules/examples -> dictate -> review transcript -> assemble platform versions -> see real history`

A new owner must land in a real personal dashboard, not in an empty composer or a forced setup wizard. A project is required only when the owner starts the first saved publication; a user-facing rubric is optional. Projects, rules, examples, and optional rubrics must persist through the existing versioned backend APIs and remain available later from the project pages.

## Implementation

- Keep the public landing page as the product explanation and primary registration entry.
- Make `/app` the real personal dashboard with projects/channels, recent real materials, and a clear first-run action.
- Allow a user to create several projects/channels, subject to the existing plan entitlement returned by the backend.
- Convert `/app/projects/new` from a visual mock into a working project form with clear Russian fields and a CSRF-protected API mutation.
- The project form collects channel-level rules: audience, voice, tone, structure, required guidance, forbidden patterns, and CTA guidance.
- After project creation, offer three explicit continuations: open the channel dashboard, add approved examples, or start dictating without a rubric.
- Convert `/app/projects/{projectId}/rubrics/new` into a working rubric form covering name, purpose, source prompt, target length, tone, structure, required elements, forbidden elements, and default platforms.
- Persist optional rubrics through the existing versioned API. Use a `voice_or_long_text` source field so the Phase 12A recorder works immediately.
- Support ordinary posts without a user rubric through a database-versioned project default content profile. Keep that profile out of the user rubric list and label the composer choice `Без рубрики — общие правила проекта`.
- Add a real project examples form where the owner can submit several ideal publications at once and optionally assign them to a rubric. Project-level examples apply to the whole channel; rubric examples take priority for that rubric.
- After project or optional rubric creation, keep the user in the understandable project journey and provide an explicit `Создать публикацию` action; the composer loads the saved project and enables the microphone.
- Keep project, rules, examples, and rubric creation reachable later from the dashboard and project pages.
- Do not import or hardcode any subject-specific project preset.
- In API mode, History must show only real content from the current workspace. Empty or failed API states must never substitute fixture cards or demo studio data.

## Data and migrations

No migration is required if the project default content profile is represented by the existing versioned rubric/input-schema tables and hidden from the user-facing rubric list. Existing data and Docker volumes remain untouched.

Local acceptance created only a synthetic test account, two projects, one optional rubric, three approved examples, and two test materials in the local MediaHub PostgreSQL database. Production acceptance added one clearly labelled synthetic `example.test` owner, one project, one approved example, and one test material. No real email or editorial data was used. PostgreSQL, Redis, Docker volumes, object storage, Caddy, and neighbouring services were not recreated or modified by the app-only cutover.

## Tests and acceptance

- A registered empty workspace opens a real empty dashboard with no demo project or demo material.
- Submitting the project form creates a versioned project and offers either direct dictation or optional rubric creation.
- Several projects can be created while the workspace entitlement allows it.
- Project-level rules are present in the versioned AI context.
- Several project-level or rubric-level ideal examples can be imported and approved from the UI.
- Direct dictation without a rubric creates content against the project's versioned default profile.
- Submitting the optional rubric form creates a versioned active rubric and redirects to the voice composer.
- History is empty for a new workspace, contains only real workspace items, and never shows fixtures in API mode.
- Opening an unavailable material shows an unavailable/not-found state rather than a demo studio.
- Validation and API failures stay on the form and show a clear Russian error without creating fake demo state.
- Existing project, rubric, auth, voice, AI, and publication tests continue to pass.
- Run lint, typecheck, production web build, repository tests, API tests, and `git diff --check`.

## Risks

- The project count is controlled by the backend entitlement; the form must show a clear backend limit error rather than silently replacing data.
- The internal project default profile must not appear as a user-created rubric or consume the user's visible rubric workflow.
- The first rubric has no approved examples until the owner adds them; generation must preserve facts and must not claim example-backed style matching.

## Rollback

- Restore the visual-only shells and remove the first-run redirects.
- Do not delete any project or rubric already created by a user.
- App rollback images are `media-hub-{api,worker,web}:rollback-20260729-171800-phase12a2`.
- The verified PostgreSQL custom-format backup, protected config snapshot, and prior app source are under `/var/backups/media-hub/20260729-171800-phase12a2`.
- No database, object-storage, or volume rollback is required for a normal application rollback.
