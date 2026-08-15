# UI Phase 12P — Restore standalone Ideas entry

## Status

Released to production on 2026-08-15 as a Web-only rollout. Local, CI, backup, cutover, and post-release gates passed.

## Goal

Restore the already released standalone `Ideas` area to the authenticated application without reverting later copy, recording, onboarding, access, or security work.

The restored path is the Phase 12J product:

`type or dictate one topic -> receive exactly five distinct directions -> choose one -> open empty author capture`.

## Evidence and decision

- Commits `ac50546`, `ce1f351`, and `31e2cdd` added, hardened, and recorded the production release of the standalone generator.
- Commit `8caebf0` kept the route, frontend component, handoff, API, validation, tests, and database history, but removed `/app/ideas` from desktop/mobile navigation during closed-pilot simplification.
- The current production API reports the standalone flag enabled and the original owner workspace allowlisted.
- The current standalone run keeps `project_id`, `rubric_id`, and `content_item_id` empty, stores no retrieved example IDs, and sends only the user's topic to the model.
- The validator still requires exactly five directions and rejects exact or materially similar items.

Phase 12P supersedes only the Phase 12N decision to hide the Ideas entry. All other Phase 12N and Phase 12O decisions remain in force.

## Scope

- Add `Идеи` back to authenticated desktop and mobile primary navigation.
- Keep the current human wording (`Наговорить`, `Тексты`, `Блокнот`, `Мой стиль`) and add Ideas as a fifth mobile destination.
- Keep Ideas as its own `/app/ideas` entity; do not embed the project-scoped legacy generator in the composer.
- Update UI contracts so the restored navigation entry is release-blocking.
- Add a focused Phase 12P contract proving the route remains standalone and the five-item diversity guard remains present.
- Do not change the API contract, database schema, migrations, stored content, feature allowlist, publication flow, or onboarding sequence.

## Verification

1. `node tools/check_phase12p_restore_standalone_ideas_contract.mjs`
2. `make lint`
3. `make typecheck`
4. `make test`
5. `make test-e2e`
6. Production Web build in API mode.
7. Browser check at 390 px and desktop: Ideas is visible, `/app/ideas` opens, no horizontal overflow appears, and the other four destinations remain available.
8. After a fresh backup, replace only the Web application container and verify public readiness plus the authenticated Ideas flow.

## Risks and mitigations

- Five mobile items have less horizontal room. Verify the current human labels at 390 px and keep the existing responsive equal-column layout.
- Non-allowlisted workspaces may see the existing plain unavailable state. Do not widen the production allowlist as part of this restoration.
- A broad rollback could remove later pilot hardening. Restore only navigation and contracts against the current head.

## Rollback

- Restore the previous Web image only.
- Remove the Ideas navigation entries and revert the Phase 12P contract changes.
- Leave API, worker, PostgreSQL, Redis, volumes, migrations, feature flags, and all idea-run history unchanged.

## Local verification — 2026-08-15

- `make lint` — passed.
- `make typecheck` — passed.
- `make test` — passed: 5 repository tests plus 172 API tests, including all Phase 12 UI contracts and 19 focused standalone-Ideas tests.
- `make test-e2e` — passed.
- Production Next.js build in API mode — passed; `/app/ideas` is present in the built route table.
- Browser acceptance at `390 x 844` showed all five mobile destinations. Every label's rendered width equalled its scroll width, and both body and document scroll widths remained exactly 390 px.
- Browser acceptance at `1440 x 1000` showed the Ideas entry in the desktop sidebar and no horizontal overflow.
- Production read-only preflight confirmed that the standalone generator is enabled, exactly one workspace is allowlisted, and the original owner workspace remains allowed.

## Production release — 2026-08-15

- Application commit: `f1da95796eca9d0aae3e96dc439fa880e4e6dcc5`.
- Release: `20260815-075603-phase12p-ideas-restored`.
- GitHub Actions quality gate `31865207163` passed before rollout.
- Fresh backup: `/var/backups/media-hub/20260815-075603-phase12p-ideas-restored`; the PostgreSQL custom-format dump, restore listing, source archive, release archive, environment snapshot, service identities, and before-state checks passed SHA-256 verification. `LATEST` points to this backup.
- Only the production Web image and container were replaced. PostgreSQL, Redis, API, and worker retained their exact container IDs; Caddy retained its PID; the neighboring service on port 3010 retained its existing `401` response.
- The released image contains both desktop and mobile `/app/ideas` entries and the standalone route. The public route returns `307` to `/login` without a session, preserving authentication protection.
- API readiness remained healthy with database, Redis, and migrations all `ok`. Database row counts, outbox status totals, and Alembic version were identical before and after the cutover. The new Web container logged no errors during the release check.
- Rollback is limited to the preserved prior Web image `sha256:5b84fa3beaae7d7a72931a10efd8f4427b831577517243202c7f696f03ef873b`; no data or backend rollback is required.
