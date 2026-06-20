# Temichev Media Hub — Codex repository instructions

## Canonical specification

- English documents under `docs/en/` are normative.
- Russian documents under `docs/ru/` are a complete translation for the product owner.
- If translations conflict, stop, report the conflict, and follow the English document only after confirming that it matches the machine-readable schemas and presets.
- Start with `README.md`, `docs/en/MASTER_SPEC.md`, and the active phase file in `plans/`.

## Working method

- Implement one phase at a time. Do not attempt the whole product in a single change.
- Before coding a phase, write or update an execution plan in `docs/exec-plans/` with assumptions, migrations, tests, risks, and rollback notes.
- Keep plans, ADRs, schemas, tests, and code synchronized.
- Prefer small vertical slices that can be run and verified locally.
- Do not silently invent product behavior. Use conservative defaults and record unresolved decisions in `docs/OPEN_QUESTIONS.md`.
- Never hardcode the “Что поесть? Армавир” project, its rubrics, prompts, or limits in application logic. It is a database-importable preset.

## Required architecture rules

- Frontend: Next.js App Router, React, TypeScript strict mode, Tailwind CSS, shadcn/ui, mobile-first PWA.
- Backend: FastAPI, Python, Pydantic v2, SQLAlchemy 2.x, Alembic.
- Data: PostgreSQL with `pgvector`; every tenant-owned row is scoped by `workspace_id`.
- Jobs: Celery + Redis, but PostgreSQL transactional outbox is the source of truth for durable publication jobs.
- Media: S3-compatible object storage; browser uploads directly with presigned URLs.
- Built-in social integrations use backend connector adapters. Frontend never calls social APIs directly.
- AI, speech-to-text, and embeddings use separate provider interfaces.
- All mutable project configuration is database-driven and versioned. JSON/YAML files are presets, fixtures, import/export, and documentation only.
- Human confirmation is required before publication in the initial product.

## Security rules

- Never place secrets in source code, fixtures, logs, screenshots, or client bundles.
- Store passwords with Argon2id.
- Store browser auth in Secure, HttpOnly, SameSite cookies. Do not store bearer tokens in `localStorage`.
- Encrypt third-party platform credentials at rest and redact them from logs.
- Enforce workspace authorization and subscription entitlements on the backend for every mutation.
- Treat webhook payloads as untrusted; verify signatures/secrets where supported and deduplicate events.

## Quality bar

For every phase:

1. Run formatting, linting, type checking, unit tests, integration tests, and relevant end-to-end tests.
2. Add or update database migrations.
3. Add acceptance tests for the behavior described in the phase document.
4. Update OpenAPI and regenerate the typed frontend client when API contracts change.
5. Update documentation and the phase status.
6. Report commands run, results, migrations, known limitations, and next recommended task.

## Default commands to establish during Phase 00

- `make dev`
- `make down`
- `make lint`
- `make typecheck`
- `make test`
- `make test-e2e`
- `make migrate`
- `make seed`
- `make openapi`

## Platform-specific non-negotiables

- Telegram primary mode for long media posts is Bot API `sendRichMessage`; the “У Доника” 4,069-character, 10-media fixture must pass as one publication. Keep a tested fallback path.
- MAX payload text must not exceed 4,000 characters.
- Instagram captions must not exceed 2,200 characters; long master posts require a separate platform variant.
- Never use a single generic character limit for all platforms. Editorial targets and connector hard limits are different fields.
- Automatic support for a new social network cannot be created entirely through UI configuration; it requires a backend connector. The UI may create manual-export and generic-webhook destinations.
