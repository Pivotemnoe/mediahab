# ADR 0001 — Monorepo and Tooling

Date: 2026-06-20
Status: accepted on 2026-06-20

## Context

The canonical spec requires a Next.js App Router frontend, FastAPI backend, Celery workers, connector packages, shared contracts, Docker Compose, and generated clients. Phase 00 must not build the full foundation.

## Decision

Use a single monorepo with:

- `apps/web` for the Next.js PWA.
- `services/api` for FastAPI.
- `services/worker` for Celery tasks.
- `connectors/*` for native platform connectors.
- `packages/*` for shared contracts, AI/content utilities, and schema helpers.
- `database/*`, `infra/*`, and `tests/*` for migrations, infrastructure, and verification.

Phase 01 will introduce pnpm and Python `uv` workspace tooling. Phase 00 uses Python standard-library scripts only so discovery checks are runnable before dependency bootstrapping.

## Consequences

- The personal pilot remains operable as a modular monolith.
- Module boundaries are explicit enough for later extraction.
- Phase 00 Make targets are intentionally minimal and must be replaced with real monorepo checks in Phase 01.
