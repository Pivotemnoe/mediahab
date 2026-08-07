# UI Phase 12F — Nagovori Brand and Offline-first Notebook

## Status

Implemented, locally verified, deployed, and production-checked on 2026-08-07. Runtime release `20260807-143954-phase12f-hydration-hotfix` uses commit `3075af0`.

## Goal

Ship the customer-facing brand **«Наговори»** with the tagline **«Твои мысли. Твой стиль. Твои публикации.»**, and make notebook capture resilient when the device cannot reach the production domain:

`open installed PWA -> type or record a note -> save it on the device -> reconnect -> synchronize and transcribe -> create exactly one server note`.

The domain remains `temichev-posthub.ru`. Repository/package names, cookie names, database table names, API prefixes, and infrastructure identities remain unchanged.

## Scope

- Add a deterministic vector logo derived from the approved speech-bubble, voice-pulse, and publication-lines concept.
- Replace visible MediaHub branding in the public/authenticated frontend with «Наговори» and the approved tagline.
- Add favicon, Apple touch, 192 px, 512 px, and maskable PWA icon assets and update metadata/manifest.
- Change the installed PWA start route to `/app/notebook`.
- Add a standalone cached offline notebook shell that contains no server-fetched notes or account data.
- Store new typed notes and recorded audio blobs in browser IndexedDB before any network request.
- Show queued local entries, device-save state, failure state, a manual synchronization action, and automatic foreground replay when the browser reports connectivity.
- Keep queued audio until the API confirms a saved note; remove it only after success.
- Accept an optional client-generated note UUID in text and atomic voice-create API requests so retries return the same `NotebookNote` instead of creating duplicates.
- Keep service-worker mutation replay and Background Sync disabled. The service worker caches GET-only shell assets; the authenticated React client performs replay with existing HttpOnly session and CSRF protections.
- Verify desktop 1440 px and mobile 390 px, including offline fallback, queued text, queued audio persistence, reconnect replay, and duplicate protection.

## Assumptions

- The owner opens `/app/notebook` once while signed in and online before relying on offline capture. This stores the current workspace context locally and installs/updates the service worker.
- Browser storage has not been manually cleared and the device is not in a private/incognito session.
- `MediaRecorder`, IndexedDB, and service workers are available. Typed notes remain available even if microphone capture is unsupported.
- OpenAI transcription still happens only after connectivity returns. Recording offline spends no OpenAI tokens.
- iOS background execution is not treated as reliable. Replay happens in the foreground on mount, on the `online` event, or after the user presses «Синхронизировать».

## API contract

- `POST /api/v1/notebook` accepts optional `client_note_id: UUID`.
- `POST /api/v1/notebook/transcribe-new` accepts optional `client_note_id: UUID`.
- If that ID already identifies a note in the requested workspace, the endpoint returns the existing note without creating another note, transcription, or usage event.
- A collision with another workspace is returned as not found without revealing the foreign row.
- Omitting `client_note_id` preserves the existing API behavior.

## Data and migrations

No database migration. The client-generated UUID reuses the existing `notebook_notes.id` primary key as the idempotency key.

Browser storage uses an IndexedDB object store dedicated to notebook capture. Entries contain workspace ID, client note ID, typed body, optional audio Blob/MIME type, optional uploaded media ID, timestamps, attempt count, and the last safe user-facing error. No auth token or third-party credential is stored.

## Tests

- API: duplicate text-create with one client note ID creates one note.
- API: duplicate atomic voice-create with one client note ID creates one note, one transcription, and one usage event.
- API: cross-workspace client note ID is not exposed.
- Frontend contract: IndexedDB entry survives reload; successful replay removes it; failed replay preserves the Blob; uploaded media ID is persisted before transcription.
- Service worker: GET-only behavior, cached offline notebook shell, no Background Sync, and no mutation replay.
- Browser: 390 px and 1440 px show the new logo without overflow.
- Browser: offline navigation reaches the cached capture shell; a typed note and fake microphone recording remain queued; online foreground replay returns one saved note.
- Quality gates: `make openapi`, `make lint`, `make typecheck`, focused tests, `make test`, production web build, visual smoke, offline smoke, and `git diff --check`.

## Risks and mitigations

- **Browser evicts local storage:** request persistent storage where supported, expose queue count, and clearly state that device storage must not be cleared before synchronization.
- **Network fails after media upload:** persist `media_id` in IndexedDB before calling transcription, then resume from that ID.
- **Response is lost after the server commits:** reuse `client_note_id`; retry returns the existing note.
- **Two tabs replay the same entry:** use an in-tab synchronization lock and server primary-key idempotency.
- **Cached personalized HTML leaks between accounts:** never cache authenticated notebook HTML as the offline fallback; cache only the neutral offline shell. Queue entries remain workspace-scoped.
- **Old installed PWA keeps stale branding:** bump the service-worker cache name and manifest assets, call `skipWaiting`/`clients.claim`, and verify the update path.

## Rollback

- Revert the web/API/docs commit and redeploy the previous API/Web/Worker images.
- No database rollback is required.
- Existing IndexedDB entries must remain readable by the previous or follow-up release; rollback must not delete browser storage.
- Production rollback must not restore PostgreSQL/Redis unless separately authorized.

## Production plan

1. Confirm target hostname, app directory, current commit/images, free disk, service health, Alembic head, and stateful container IDs/counts.
2. Back up PostgreSQL, protected config, source, row counts, and rollback image tags.
3. Build release images in an isolated release directory and run API import/schema checks.
4. Recreate only API/Web/Worker; apply no migration.
5. Verify public home, manifest/icons/service worker, `/api/v1/health/live`, `/ready`, API idempotency route schema, application logs, row counts, and unchanged PostgreSQL/Redis IDs.
6. Perform 390 px and 1440 px public/authenticated smoke. The owner performs the final real-microphone/offline-device acceptance after deployment.

## Local verification result — 2026-08-07

- `make openapi`, `make lint`, `make typecheck`, `make test`, `make test-e2e`, the production web build, and `git diff --check` passed.
- The full API suite passed: 103 tests. The focused notebook suite passed: 9 tests, including idempotent text and voice retries and cross-workspace isolation.
- Public landing and authenticated notebook visual smoke passed at 390 px and 1440 px without horizontal overflow.
- The managed offline browser smoke physically stopped the local Next.js server. The cached neutral shell opened at both widths; at 390 px, one typed note and one fake microphone recording remained in IndexedDB, including the audio Blob.
- A freshly rebuilt local API passed `/api/v1/health/ready`. PostgreSQL control counts were unchanged after the API-only restart: 4 users, 4 workspaces, and 1 notebook note.
- No database migration is present or required.
- Production authenticated acceptance exposed a server/client timezone mismatch in note timestamps. The timestamp now renders a stable placeholder during hydration and formats in the device timezone only after mount, removing the React hydration error without fixing the product to one tenant timezone.

## Production result — 2026-08-07

- The initial application release `20260807-142355-phase12f-nagovori-offline` recreated only API/Web/Worker. The timestamp follow-up `20260807-143954-phase12f-hydration-hotfix` rebuilt and recreated only Web.
- Public home, login, registration, offline shell, live health, and ready health return HTTP 200. The manifest starts at `/app/notebook`; logo, PNG icons, `nagovori-shell-v2`, and the `client_note_id` OpenAPI contract are publicly available.
- Authenticated acceptance used the owner's existing production session without creating or changing a note. The real notebook showed «Наговори», existing server notes, `Надиктовать заметку`, and a clean browser console after the hydration hotfix. At 390 px the page had a 390 px scroll width and no horizontal overflow.
- PostgreSQL and Redis container identities stayed unchanged. Alembic stayed at `202606200011 (head)`. Recorded row counts stayed exactly unchanged: 13 users, 13 workspaces, 11 projects, 17 content items, 58 revisions, 26 media assets, 5 notebook notes, and 7 publications.
- The physically-stopped-server offline test passed locally. Production serves byte-identical offline shell and service-worker files, but final iPhone/Safari acceptance during a real outage remains an owner-device check because DevTools offline emulation is not equivalent to the regional allow-list outage.
- Full pre-release backup: `/var/backups/media-hub/20260807-142355-phase12f-nagovori-offline`. Web hotfix rollback evidence: `/var/backups/media-hub/20260807-143954-phase12f-hydration-hotfix`.
