# UI Phase 12G — Examples-First Style and Trusted Voice Feedback

## Status

Implemented, locally verified, and released to production on 2026-08-11. The product owner approved a web-only cutover in the existing `temichev-posthub.ru` Docker contour.

## Goal

Make the shortest useful path obvious:

`name the channel -> add successful posts -> dictate an idea -> see recording and saving state -> receive platform-specific drafts`.

Successful-post examples are the primary style input. Project rules and rubrics remain available as optional refinements. Voice capture must always communicate whether audio is being received, stored on the device, synchronized, or transcribed.

## Product decisions

- The interface says that examples help the editor match style; it does not claim model fine-tuning. The existing approved-example retrieval and embedding pipeline remains authoritative.
- Recommend at least 10 strong examples for a channel, while allowing the user to save a smaller initial set and add more later.
- Examples may come from the user's own channel or from other publications whose style they want to approach. They are style references only and never factual sources for a new post.
- Examples are project-wide by default. An optional rubric selector narrows a batch only when a repeated format truly differs.
- Project name and examples are primary onboarding. Audience, structure, humor, CTA, forbidden phrases, description, and other explicit rules move into a collapsed `Дополнительные настройки` section.
- Rubrics and advanced project builders are retained and remain accessible after onboarding; they are not part of the default first-use path.
- Browser recording feedback uses an elapsed timer and the real microphone level when the Web Audio API is available. It degrades to an animated recording indicator when level measurement is unavailable.
- Local persistence precedes network synchronization. The UI distinguishes `recording`, `saving on this device`, `waiting for connection`, `sending`, `transcribing`, `saved in notebook`, and `failed` states without promising background sync.

## Scope

- Simplify `/app/style` around one primary action: add successful posts.
- Replace the first project screen with the compact API-backed project form in both API and fixture rendering; remove the old technical fixture wizard from the default route.
- Reduce the visible project form to channel name and topic, with all structured fields under progressive disclosure.
- Make `Создать и добавить примеры` the primary project action.
- Redesign the existing examples import form as a compact collection flow:
  - one paste field;
  - add-to-selection action;
  - visible `N из 10` recommendation and progress bar;
  - compact removable previews;
  - optional project/rubric scope;
  - one save-and-approve action using the existing API.
- Keep the advanced per-project rules and rubric pages reachable from `Дополнительные настройки` or existing `Ещё` navigation.
- Add explicit notebook quick-dictation feedback:
  - timer;
  - real audio-level bars when supported;
  - prominent stop-and-save action;
  - accessible live status text;
  - indeterminate progress during local save/synchronization/transcription.
- Add visible local-draft save confirmation and clearer queued-entry states.
- Preserve current IndexedDB idempotency, localStorage draft recovery, API contracts, transcription, retention, tenant isolation, and human approval before publication.

## Out of scope

- Model fine-tuning or training a new foundation model.
- Changing example embeddings, retrieval ranking, AI provider contracts, generation prompts, or database schema.
- Importing from a social account automatically, scraping third-party posts, or bypassing copyright and access controls.
- Background Sync claims, native offline speech recognition, or guaranteed transcription while offline.
- Backend, connector, publication, billing, production-data, or production-configuration changes. The separately approved release operation may rebuild and recreate only the existing Web service.
- Deleting the advanced builder, project rules, rubrics, or existing historical routes.

## Migrations and API

No database migration or OpenAPI change is planned. The slice uses the existing project-create and example-import endpoints and the existing offline notebook queue.

## Acceptance checks

- A new user sees no technical project wizard on `/app/projects/new`.
- The visible first project step contains only channel name, optional topic, and the primary route to examples. Structured rules are collapsed by default.
- The examples screen explains `10 recommended`, accepts one or more complete posts, shows the current count, and saves them through the existing API with project-wide scope by default.
- A rubric can be selected without becoming mandatory.
- The examples copy explicitly states that references guide style and cannot supply facts.
- Starting quick dictation immediately shows `Запись идёт`, an elapsed timer, a visible level/animation, and `Остановить и сохранить`.
- Stopping shows the local-save stage before any network stage.
- Offline voice/text entries visibly say that they are saved on this device and waiting for the app to be opened online; online synchronization visibly shows sending/transcription progress.
- The quick text draft visibly confirms local saving.
- Desktop and 390 px layouts have no horizontal overflow; focus, live-region, pressed-state, and reduced-motion behavior remain usable.

## Verification

- `make lint`
- `make typecheck`
- `make test`
- `pnpm --filter @temichev/web build`
- `node tools/check_offline_notebook_contract.mjs`
- update the authenticated-app visual contract for the new style, examples-first project form, and notebook status copy;
- in-app Browser inspection of `/app/style`, `/app/projects/new`, `/app/projects/{projectId}/examples`, and `/app/notebook` at desktop and 390 px;
- interaction checks for progressive settings, example collection/count/removal, recording UI using a controlled mocked `MediaRecorder` state without accepting a real microphone permission, and offline/local-save messaging;
- console-error and horizontal-overflow checks;
- `git diff --check`.

## Risks

- Ten pasted examples can create a tall screen. Mitigation: collect one post at a time and show compact previews instead of ten open textareas.
- Users may interpret examples as permission to copy facts or wording. Mitigation: state clearly that examples guide voice and rhythm only; generation continues to use locked current facts.
- Real microphone amplitude is browser-dependent. Mitigation: keep timer and recording state authoritative and use a safe visual fallback.
- Immediate online synchronization can make intermediate states brief. Mitigation: persist distinct status text and accessible progress semantics without adding artificial delay.
- The repository contains untracked generated `output/` and `tmp/` artifacts. Mitigation: do not modify or remove unrelated artifacts and keep new audit screenshots under a dedicated temporary folder.

## Rollback

Revert this plan and its Russian translation, the style page hierarchy, compact project onboarding, examples collection UI, notebook recording feedback, and focused contract-test updates. Existing API data and offline entries require no rollback.

## Local completion evidence

- `make lint` passed.
- `make typecheck` passed.
- `make test` passed: 5 repository tests and 104 API tests, plus UI hardening contracts.
- `make test-e2e` passed.
- `pnpm --filter @temichev/web build` passed with all 34 application routes generated.
- The new examples-first contract, offline notebook contract, service-worker capability contract, and `git diff --check` passed.
- In-app Browser inspection covered style, project creation, examples, and notebook at `1280 x 720` and `390 x 844`. Progressive settings opened correctly; one-by-one and bulk example insertion, count updates, and removal worked; no horizontal overflow or console warnings/errors were observed.
- Real microphone permission was not accepted during automated visual QA. Timer, live microphone-level measurement, local-first persistence order, and recording/synchronization copy are covered by typed code and contract checks; a real-device voice acceptance remains the owner-facing post-release check.

## Production release evidence

- Release: `20260811-092631-phase12g-examples-first` from commit `e90079b1e7a12e4ee5848e3805d71a4c3b830469`; deployed at `2026-08-11T06:31:36Z`.
- Delivery used a Git archive with SHA-256 `0980888b04478247acbec313c1ef9277819f16820fee8bb37b244ecd1bddaec1` and a server-side local Docker build.
- Backup `/var/backups/media-hub/20260811-092631-phase12g-examples-first` contains the previous source, configuration snapshots, a validated PostgreSQL custom dump, protected-container metadata, control counts, and the rollback Web image.
- Only `media-hub-web-1` was recreated. Its container changed from `566d16ae...` to `5d6c7f84...` and now runs image `sha256:da5c9ee4...`.
- API `f48f2af0...`, Worker `8390b62e...`, PostgreSQL `3ac07753...`, and Redis `038bcb78...` retained the same container IDs and start times. PostgreSQL and Redis named volumes were preserved.
- Control counts stayed `13|13|11|17|58|26|5|7` for users, workspaces, projects, content items, content revisions, media assets, notebook notes, and publications.
- Local Web, public home, features, offline notebook, and public live/ready health checks returned `200`. Caddy stayed active; `www` kept its redirect and the neighboring `berisegodnya.ru` contour kept its expected `401`.
- Production Browser acceptance verified `/app/style`, the real project's examples route, and `/app/notebook` at desktop plus `/app/style` at 390 px. Counts loaded from production data, the microphone action was enabled, no horizontal overflow appeared, and console warnings/errors were empty.
- No migration, API, Worker, PostgreSQL, Redis, Caddy, registry, CI workflow, or new `LATEST` marker was created or changed.
