# Отчёт Phase 01 — Foundation

Дата: 2026-06-20
Статус: выполнено локально

## Что сделано

1. Создан monorepo foundation:
   - `apps/web` — Next.js App Router technical shell.
   - `services/api` — FastAPI service.
   - `services/worker` — Celery worker skeleton.
   - `packages/contracts` — shared OpenAPI/contracts placeholder.
   - `connectors/base` — базовые connector capability primitives.
   - `database/migrations` — Alembic baseline.
   - `infra/docker` — Dockerfiles.
2. Добавлен спокойный технический frontend:
   - главная technical page;
   - `/app` cabinet shell;
   - простые `Button`, `Card`, `Badge`;
   - Tailwind theme без финального брендинга.
3. Добавлен FastAPI health API:
   - `/healthz`
   - `/api/v1/health/live`
   - `/api/v1/health/ready`
4. Добавлены OpenAPI export targets:
   - `packages/contracts/openapi/openapi.json`
   - `apps/web/src/generated-api/openapi.json`
5. Добавлен Docker Compose stack:
   - PostgreSQL + pgvector
   - Redis
   - MinIO
   - API
   - worker
   - web
6. Добавлена baseline migration:
   - `202606200001_phase01_baseline.py`
   - включает `CREATE EXTENSION IF NOT EXISTS vector`
   - создаёт техническую таблицу `phase01_markers`
7. Добавлен baseline seed.
8. Обновлён local development runbook.

## Порты

Порты выбраны не стандартные, потому что на машине уже были другие Docker services:

- Web: `http://localhost:3100`
- API docs: `http://localhost:8100/docs`
- API ready: `http://localhost:8100/api/v1/health/ready`
- Postgres: `localhost:55434`
- Redis: `localhost:6380`
- MinIO: `http://localhost:9101`

## Проверки

1. `make deps` — PASS.
2. `make openapi` — PASS.
3. `make lint` — PASS.
4. `make typecheck` — PASS.
5. `make test` — PASS: 5 Phase 00 tests + 2 API health tests.
6. `make test-e2e` — PASS: smoke verifies web/API/OpenAPI skeleton.
7. `make migrate` — PASS against local Docker Postgres.
8. `make seed` — PASS against local Docker Postgres.
9. `make validate-spec` — PASS: `checks=67 files=157 errors=0`.
10. Docker Compose stack — PASS, all six services running.
11. `curl http://localhost:8100/api/v1/health/ready` — PASS.
12. `curl -I http://localhost:3100/app` — PASS, HTTP 200.

## Технические замечания

- Docker Compose needs explicit project name `media-hub` because the repository path contains Cyrillic and a space.
- Docker Desktop build failed from the original path, so verification used an ASCII symlink: `/private/tmp/media-hub-workspace`.
- `greenlet` was added for async SQLAlchemy/Alembic migration execution.
- Frontend is intentionally technical, not final visual design.
- No authentication, project builder, content editor, AI pipeline, or live social connector logic was implemented in Phase 01.

## Следующий этап

Phase 02 should add authentication, workspaces, secure sessions, roles, billing/entitlement skeleton, and server-side tenant authorization tests.
