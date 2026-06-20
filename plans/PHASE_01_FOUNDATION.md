# Phase 01 — Foundation

## Objective

Create a clean, reproducible monorepo and local development platform without implementing product-specific behavior.

## Deliverables

- pnpm workspace for TypeScript packages and apps.
- Python `uv` project/workspace for API, worker, connectors, and packages.
- Next.js App Router application with TypeScript strict mode, Tailwind, shadcn/ui baseline, Russian locale wiring, and PWA manifest placeholder.
- FastAPI application with Pydantic v2, SQLAlchemy 2.x, Alembic, asyncpg, structured error format, and OpenAPI.
- Celery worker and Redis wiring.
- PostgreSQL with pgvector and MinIO for local S3-compatible development.
- Typed frontend API client generated from OpenAPI.
- Docker Compose, development proxy, health/readiness endpoints, Makefile, CI, formatting, linting, type checking, unit-test baseline, and structured logs.
- Target repository tree aligned with `docs/en/MASTER_SPEC.md`.

## Non-goals

- Authentication.
- Project/rubric business logic.
- Live AI or social-network publication.

## Acceptance

- A clean checkout can execute `make dev`, `make migrate`, `make seed`, `make lint`, `make typecheck`, and `make test` using documented prerequisites.
- Web, API, worker, PostgreSQL, Redis, and object storage health are visible.
- OpenAPI client regeneration is deterministic and checked in CI.
- No “Что поесть? Армавир” conditionals exist in code.
