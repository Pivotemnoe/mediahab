# UI Phase 12A.1 - NL OpenAI Relay and Signup Entry

## Status

Implemented, locally verified, and deployed to production on 2026-07-29. This is a narrow operational follow-up to the verified Phase 12A voice-first MVP. It does not replace the planned Phase 12B rubric editor.

Verification evidence:

- The dedicated NL proxy returned a real OpenAI models response on the NL host.
- Direct CONNECT from the local Russian network timed out, so the local test runtime now uses an SSH local forward to the same NL proxy, matching the established tunnel pattern.
- A real Media Hub `Responses` request through the SSH forward and NL proxy succeeded with `gpt-4.1-mini`.
- Local API registration and the subsequent `/me` cookie-session request both returned HTTP 200 against PostgreSQL.
- An unauthenticated request to `/app` returned 307 to `/login?next=/app`; an authenticated in-app browser loaded the voice-first composer.
- The public home and registration form were inspected in the in-app browser; all four registration fields are required.
- Lint, typecheck, the production web build, 5 repository tests, 51 API tests, and `git diff --check` passed.
- Production release `20260729-094025` is active at `https://temichev-posthub.ru` on RU host `89.169.46.92`.
- Public home, registration, login, liveness, and readiness returned HTTP 200; an unauthenticated `/app` returned 307 to `/login?next=/app`.
- A production smoke account completed registration, `/me`, authenticated `/app`, and logout with HTTP 200. The session was revoked after the check.
- A real structured OpenAI request from the production API container succeeded with `gpt-4.1-mini` through the authenticated NL proxy on `5.129.239.104:18080`.
- PostgreSQL and Redis container IDs remained unchanged across the cutover. Caddy remained active, and the neighbouring site retained its expected HTTP 401 response.

Deployment note: the previously documented Media Hub RU reverse-tunnel port `22089` was offline and was not used. The production RU host can reach the authenticated allowlisted NL proxy directly, so production uses the explicit server-only `OPENAI_PROXY_URL`. Generic S3 and social connector traffic is not routed through this setting.

## Objective

Make the current MVP testable from a Russian device without a device VPN:

1. Route every Media Hub backend call to OpenAI through the dedicated authenticated NL egress proxy on `5.129.239.104`.
2. Make the public entry lead an unauthenticated user to working registration or login.
3. Prevent an unauthenticated browser from entering the normal `/app` UI.

The OpenAI API key and proxy credentials remain server-side and must not enter the browser bundle, source code, logs, screenshots, or committed fixtures.

## Assumptions and preflight evidence

- The dedicated NL unit `mediahub-openai-proxy.service` is active on `5.129.239.104`.
- It is an authenticated HTTP CONNECT proxy and allowlists `api.openai.com:443`; it is not a general open proxy.
- Current Media Hub OpenAI calls are made only by FastAPI through `httpx` for Responses, embeddings, and audio transcription.
- Registration, Argon2id password hashing, secure session cookies, workspace creation, and the free subscription already exist in the backend.
- Email delivery is not part of this personal test slice. A real email address may identify the account, but production verification mail is not claimed.

## Implementation

### Backend egress

- Add optional `OPENAI_PROXY_URL` configuration.
- Centralize OpenAI `httpx.AsyncClient` construction so text generation, embeddings, and transcription use the same explicit proxy.
- Keep direct OpenAI access as the default only when the setting is absent, preserving tests and development fallback.
- Document the setting without committing credentials.

### Public signup entry

- Make registration the primary public action and keep login clearly visible.
- Keep `/register` as a real server-backed form and require all registration fields in the browser.
- Add server-side `/app` authentication gating in API mode; redirect missing or invalid sessions to `/login`.
- Keep fixture mode available for design-only development.

## Data and migrations

No database migration is required. Existing users, workspaces, sessions, content, media, publication records, Docker volumes, and presets remain untouched.

The production preflight confirmed Alembic revision `202606200008 (head)`, so no migration was executed. A verified PostgreSQL custom-format backup and protected configuration snapshot were created at `/var/backups/media-hub/20260729-094025` before the cutover. The production smoke test added one clearly named technical `example.test` account and workspace; it contains no real email address or editorial data.

## Tests and acceptance

- Unit tests prove all three OpenAI call paths receive the configured proxy and do not expose it in payloads.
- Existing OpenAI provider tests continue to pass without a proxy.
- Registration with a unique real-format email creates an account, session, workspace, and free subscription.
- An unauthenticated request to `/app` redirects to login in API mode.
- A registered browser reaches `/app` with its session cookie.
- A real OpenAI request from the local backend succeeds through the authenticated NL proxy.
- Run `make lint`, `make typecheck`, focused API tests, full `make test`, web production build, and `git diff --check`.

## Risks

- Proxy credentials in a URL are sensitive. They must exist only in protected environment configuration.
- `HTTPS_PROXY` could unintentionally affect S3 or social connectors. Use the explicit OpenAI-only setting instead.
- A reachable proxy attracts scans even with authentication. Keep the destination allowlist and strong credentials; later restrict source IPs when the final RU host is fixed.
- A real email address is not proof of ownership until transactional email delivery is implemented.

## Rollback

- Remove `OPENAI_PROXY_URL` to restore the previous direct OpenAI route.
- Revert the `/app` API-mode auth gate and public CTA changes without touching backend auth or data.
- No database or object-storage rollback is needed.
- Retag the preserved `media-hub-{api,worker,web}:rollback-20260729-094025` images and recreate only those three stateless services if an application rollback is required.
- Restore `/var/backups/media-hub/20260729-094025/media_hub.dump` only if a separately confirmed database recovery is required; normal application rollback must not recreate PostgreSQL, Redis, or their volumes.
