# Phase 00 Execution Plan — Discovery, ADRs, and Platform Spikes

Date: 2026-06-20
Status: accepted on 2026-06-20
Scope guard: do not start Phase 01 foundation work.

## Product Boundaries

1. The product is a multi-tenant SaaS content studio, not a hardcoded food-channel bot.
2. Workspaces are the tenant boundary.
3. A workspace can contain multiple projects.
4. Projects, rubrics, prompts, rules, examples, limits, and destinations are database configuration.
5. Preset YAML/JSON files are import/export and fixture data only.
6. A content item is platform-independent source content plus revisions.
7. AI edits and adapts; it must not invent locked facts.
8. Human approval is required before publication in the initial product.
9. Master text and platform variants are separate immutable revisions.
10. Editorial targets and connector hard limits are different fields.
11. Native automatic platform integrations are backend connector code.
12. Manual export and generic webhook destinations may be user-configured.
13. Publication attempts are independent per destination.
14. PostgreSQL outbox is the durable source of publication jobs.
15. Media uploads go directly to S3-compatible storage through presigned URLs.
16. Browser auth uses secure server-side session cookies, not localStorage bearer tokens.
17. Provider families for text, STT, and embeddings are separate interfaces.
18. Billing is entitlement-driven and enforced by the backend.

## Canonical Inputs Read

- `AGENTS.md`
- `README.md`
- `codex/00_START_HERE_RU.md`
- `docs/en/*.md`
- `plans/PHASE_00_DISCOVERY_AND_SPIKES.md`
- `reference/OFFICIAL_SOURCES.md`
- `platform-policies/*.yaml`
- `schemas/*.json`
- `presets/chto-poest-armavir/*`
- `fixtures/telegram-donika.json`

Future phase files were read only to understand dependencies and avoid Phase 01 work.

## Official Documentation Re-check

Phase 00 re-checks must distinguish documented limits from observed live behavior.

- Telegram Bot API page currently documents Bot API 10.1 Rich Messages, `RichBlockCollage`, and `sendRichMessage`.
- MAX docs currently document `POST /messages`, 4,000-character message text, `Authorization` header usage, upload tokens, `attachment.not.ready`, webhook HTTPS requirements, and `X-Max-Bot-Api-Secret`.
- Instagram/Meta content publishing still requires a full account/app/permission readiness check before any live claim. Contract payloads are local only until credentials and app review status are supplied.

## Contradictions, Missing Access, and Technical Assumptions

### Contradictions or spec tension

- Telegram Rich Messages are now visible in the official Bot API documentation, but the product still needs a live channel/client test before treating the layout as production-safe.
- `docs/en/MASTER_SPEC.md` says every phase should add migrations, but Phase 00 has no persistent application schema. Decision: document "no migrations" for this phase.
- `AGENTS.md` lists default `make` commands to establish during Phase 00, while Phase 01 owns the real monorepo. Decision: add Phase 00-safe commands that run checks or explicit no-ops until Phase 01 replaces them.
- MAX policy marks edit/delete as true, but Phase 00 still lacks observed behavior for the owner's channel and media mix. Decision: leave as documented capability, not live evidence.

### Missing access

- Telegram bot token and test channel with admin/post rights.
- Telegram client evidence on Android, iOS, Desktop, and Web.
- MAX bot token and test channel/chat access.
- MAX live 10-item mixed-media evidence.
- Instagram professional account details, Meta app, OAuth redirect URL, scopes, review status, and test user.
- Production domain, sender email provider, VPS, S3 provider, and backup destination.
- Live AI/STT/embedding provider credentials and preferred first provider.

### Technical assumptions for Phase 00 only

- Use Python standard library for spike builders and tests so the repository remains runnable before Phase 01 dependency tooling.
- Snapshot media URLs are deterministic HTTPS placeholders and are not claimed to be fetchable live media.
- Contract tests validate payload shape, counts, limits, and secret hygiene; they do not publish externally.
- Phase 00 creates no database migrations, no Next.js app, no FastAPI service, and no Docker Compose stack.

## Tasks

1. Create ADRs for monorepo/tooling, browser auth, tenancy/RLS, outbox, S3 media delivery, provider interfaces, and connector capability registry.
2. Add a minimal spike script that builds deterministic local payload snapshots for Telegram, MAX, and Instagram.
3. Add contract tests for the Telegram Donika fixture, MAX 4,000-character limit, MAX upload/readiness plan, Instagram 2,200-character caption, and carousel payload shape.
4. Update `docs/OPEN_QUESTIONS.md` with owner decisions and live-test blockers.
5. Add Phase 00-safe Make targets.
6. Run validation and tests.

## Migrations

None. Phase 00 has no database schema or persistent application tables. The first migration set belongs to Phase 01/02 after owner approval.

## Tests and Checks

- `python3 tools/phase00_spikes.py --write-snapshots`
- `python3 -m unittest discover -s tests`
- `python3 tools/validate_spec.py`
- `make lint`
- `make typecheck`
- `make test`
- `make test-e2e`
- `make migrate`
- `make seed`
- `make openapi`

## Risks

- Official platform behavior may change between this re-check and connector implementation.
- Placeholder media URLs cannot validate platform fetch behavior.
- Instagram live readiness is mostly external: account type, Meta app ownership, scopes, app review, and quota access.
- MAX mixed-media count remains unverified without live credentials.

## Rollback

Remove Phase 00 scaffold files, snapshots, ADRs, and this execution plan. No database or external state is created by the local-only implementation.
