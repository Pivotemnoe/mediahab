# UI Phase 12O — Human copy and terminology release

## Status

Locally accepted on 2026-08-15. Approved by the product owner on 2026-08-14 for implementation, verification, GitHub publication, and production deployment. GitHub publication and the production rollout are still pending.

## Goal

Apply the approved editorial audit to every currently reachable public and pilot screen without changing product behavior:

`plain user action -> visible product result -> one consistent Nagovori voice`

The interface addresses the user as `ты`, including plain-language legal and security notices, while preserving their meaning. User actions use short verbs such as `Наговори`, `Выбери`, `Проверь`, and `Сохрани`. Product actions name the product explicitly: `«Наговори» подготовит`, `«Наговори» сохранит`, and `«Наговори» подберёт`.

## Scope and assumptions

- Replace user-facing technical, administrative, and mixed-voice copy in the public site, authentication, first-run tour, dashboard, composer, notebook, style/examples, content history/detail, projects/formats, account/settings, unavailable routes, empty states, loading states, errors, backend validation summaries, and mock/fallback text that can reach the UI.
- Standardize visible product nouns: `канал`, `публикация`, `текст для площадки`, `текст из записи`, `кабинет`, and `формат`.
- Remove or hide duplicate calls to action, test-only addresses/buttons, fake tariff cards, and implementation diagnostics where this does not change a working backend capability.
- Keep real platform limits, truthful offline behavior, manual publication confirmation, invite-only access, and legally relevant facts.
- Do not introduce a first-person assistant persona. The product speaks as `«Наговори»`.
- Do not alter API contracts, database models, migrations, provider configuration, publication semantics, authentication rules, stored data, or connector behavior. Backend edits in this phase are limited to user-visible wording and Russian number agreement.
- Update contract and visual-smoke expectations together with the copy.

## Orthography and editorial verification

- Review every changed Russian string in context, including punctuation, `ё`, dash style, quotes, agreement, case, and consistent `ты`/`вы` usage.
- Run an automated repository scan for prohibited technical terms and mixed-voice phrases in user-facing source files.
- Run a second changed-string review independent of the implementation diff, then inspect rendered desktop and 390 px screens.
- Treat identifiers, route names, fixture keys, API schemas, and internal logs as technical code, not user-facing copy.

## Data and migrations

No database or OpenAPI migration is required. This release changes frontend presentation plus user-visible backend validation/fallback wording; response schemas and behavior stay unchanged.

## Acceptance

- All reachable public and pilot screens use the approved voice and terminology.
- No request IDs, raw API/backend messages, provider/model/token/cost/queue diagnostics, test Telegram address, phase labels, or fixture-mode labels appear in the ordinary user path.
- Each screen has one clear primary action; duplicate actions with the same effect are removed or consolidated.
- The three-step first-run tour remains truthful, skippable, and replayable.
- Invite-only registration, owner-assisted recovery, offline notebook guarantees, and manual publication approval remain factually correct.
- Existing accessibility names, form labels, and state announcements remain meaningful.
- Lint, typecheck, full unit/integration tests, E2E, production web build, dependency audit, UI copy contract, and browser acceptance pass.

## Production target and preservation

- Target: `https://temichev-posthub.ru` on `msk-1-vm-e21q` / `89.169.46.92`, application directory `/var/www/media-hub`.
- Create a fresh protected backup and rollback image tags before cutover.
- Recreate only the Media Hub application containers required by the final diff. The accepted diff changes both web and backend application code, so the rollout requires `web`, `api`, and the application worker while preserving all stateful services.
- Preserve PostgreSQL, Redis, all volumes, server `.env`, Caddy, the NL proxy, queued outbox records, and the neighboring `Бери сегодня` application.
- Verify stateful container identities, control counts, public health, login/registration boundaries, core browser flows, logs, and deployed source marker after rollout.

## Release gate

1. Review the exact diff and run `git diff --check`.
2. Run `make lint`, `make typecheck`, `make test`, and `make test-e2e`.
3. Run the production API-mode web build and production dependency audit.
4. Run the dedicated human-copy/orthography contract and visual smoke checks.
5. Commit intentionally and push the current release branch.
6. Confirm the GitHub source state and checks when authentication permits; never claim a passed GitHub gate without evidence.
7. Run read-only production preflight, create and validate a fresh backup, then perform the smallest application-only rollout.
8. Run automated and browser post-release acceptance.

## Risks and rollback

- A text replacement can accidentally alter a contractual or legal meaning. Preserve facts and require contextual review for legal, security, retention, and access copy.
- A broad replacement can touch internal identifiers or tests. Edit explicit user-facing locations and update tests intentionally; do not use blind repository-wide substitutions.
- Copy can overflow on mobile. Verify the longest changed states at 390 px and desktop before and after deployment.
- Rollback is a stateless application-code rollback to the release-specific previous image. No database restore, schema downgrade, stateful-service restart, or volume change is required.

## Local acceptance evidence — 2026-08-15

- `git diff --check`, `make lint`, `make typecheck`, `make test`, and `make test-e2e` passed. The API suite completed 172 tests successfully.
- `pnpm --filter @temichev/web build` passed in production API mode; `pnpm audit --prod` reported no known vulnerabilities.
- The dedicated Phase 12O contract passed together with all existing UI hardening contracts.
- Browser acceptance covered public pages, invite/login/recovery, dashboard, notebook, composer, generated Telegram and MAX texts, projects, style/examples, rules, formats, settings, account, unavailable sections, the three-step tour, replay, and skip.
- Desktop and 390×844 layouts had no horizontal overflow. The final clean browser tab recorded no console errors or warnings.
- Browser testing exposed and corrected two issues missed by source review: a formal fallback call to action in generated text and noisy/incorrect retention wording (`0 Б` and the singular-day form).
