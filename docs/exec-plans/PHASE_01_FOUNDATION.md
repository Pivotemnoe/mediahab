# Phase 01 Execution Plan — Foundation

Date: 2026-06-20
Status: in progress

## Scope

Create a reproducible monorepo and local platform skeleton. Do not implement
authentication, project/rubric business logic, AI generation, or live social
publication in this phase.

## Assumptions

- Product-owner approved Phase 00 and ADR 0001-0007 on 2026-06-20.
- Frontend design may be a calm technical shell; visual refinement can happen
  after contracts and workflows are stable.
- Local development uses pnpm for TypeScript and Python 3.13 with uv workspace
  conventions. The current machine does not expose `uv` globally, so local
  checks bootstrap a `.venv` with pip and include `uv` as a dev dependency.

## Deliverables

1. Root monorepo metadata: pnpm workspace, TypeScript base config, Python
   workspace config, `.env.example`, `.gitignore`, Makefile.
2. Next.js App Router shell in `apps/web` with Tailwind and small shadcn-style
   primitives.
3. FastAPI service in `services/api` with health endpoints and OpenAPI export.
4. Celery worker skeleton in `services/worker`.
5. Shared contract and connector-base package placeholders.
6. Docker Compose for PostgreSQL + pgvector, Redis, MinIO, API, worker, and web.
7. Alembic baseline migration and baseline seed placeholder.
8. Tests and smoke checks wired into Make targets.

## Migrations

Baseline Alembic revision:

- `202606200001_phase01_baseline.py`
- Creates `vector` extension if available.
- Creates a minimal `phase01_markers` table used only to prove the migration
  pipeline exists.

This migration is intentionally not a product data model. Product tables begin
in Phase 02 and Phase 03.

## Tests

- `make lint`
- `make typecheck`
- `make test`
- `make openapi`
- `make test-e2e`
- `make validate-spec`

`make dev` starts Docker Compose and is verified separately when Docker and
networked image/dependency access are available.

## Risks

- Docker image pulls and package installs need network access.
- `uv` is not globally installed on the machine, so the first local bootstrap
  uses pip and documents the uv convention.
- The current UI is a technical shell and does not yet represent final UX.

## Rollback

Remove `apps`, `services`, `packages`, `connectors`, `database`, `infra`,
root workspace files, and this execution plan. No external state is created
unless `make dev`/Docker services are run.
