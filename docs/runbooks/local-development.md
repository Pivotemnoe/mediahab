# Local Development Runbook

## Prerequisites

- Node.js 22 or newer.
- pnpm 11.
- Python 3.13.
- Docker with Compose plugin.

On this Codex desktop machine, pnpm is available at:

```text
/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm
```

## Bootstrap

```bash
make deps
make openapi
make lint
make typecheck
make test
```

## Run

```bash
make dev
```

Local URLs:

- Web: `http://localhost:3100`
- API docs: `http://localhost:8100/docs`
- API health: `http://localhost:8100/api/v1/health/ready`
- MinIO console: `http://localhost:9101`

## Stop

```bash
make down
```

## Migrate And Seed

After Docker services are up:

```bash
make migrate
make seed
```

## Notes

Phase 01 only proves the platform foundation. Authentication, project builder,
content studio, AI, and connectors are later phases.
