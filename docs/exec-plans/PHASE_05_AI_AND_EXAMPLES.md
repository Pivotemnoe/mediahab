# Phase 05 — Examples And AI Editorial Pipeline

## Objective

Build a controlled editorial pipeline for approved examples, small-set retrieval, structured AI runs, master assembly, hook and rating suggestions, CTA, and deterministic quality gates.

## Non-Goals

- Platform variants, previews, publication, scheduling, outbox, or connector delivery.
- Fine-tuning custom models.
- Final production UI design.
- Sending live OpenAI requests during automated tests.

## Current-State Findings

- Phase 04 provides content items, source blocks, locked facts, media, voice, and master revision slots.
- Project/rubric versions already store `provider_preferences`, `example_retrieval`, generated fields, editorial limits, and rating policy.
- OpenAI STT is wired; text generation and embedding provider boundaries are still missing.
- Frontend is a Russian technical shell and must remain Russian-visible.

## Assumptions And Open Questions

- Default local text and embedding providers are deterministic `mock` to avoid accidental spend.
- OpenAI text generation and embedding adapters are wired through environment variables but live quality/cost smoke requires explicit real credentials and sample content.
- YandexGPT and GigaChat are contract-complete mock adapters until credentials, SDK/API decisions, and budget are approved.
- `generation_runs` are durable records, but Phase 05 executes synchronously inside the API request. Worker orchestration can be attached later.
- Embeddings are stored as JSON vectors in this slice so SQLite tests stay simple; production pgvector indexing can be added without changing API contracts.

## Files And Modules

- Extend `services/api/app/db/base.py` with example, provider config, generation run, and generation step models.
- Add Alembic revision `202606200005_phase05_examples_ai_pipeline.py`.
- Add `services/api/app/modules/ai` provider interfaces, OpenAI-ready adapters, deterministic mock providers, retrieval, validation, and assembly helpers.
- Add `services/api/app/api/v1/routes/ai.py`.
- Add Phase 05 tests under `services/api/tests/test_ai_examples_pipeline.py`.
- Add Russian frontend technical routes under `/app/ai` and `/app/projects/[projectId]/examples`.
- Update OpenAPI, e2e smoke, ADR index, open questions, and Russian report.

## Database Migration And Rollback

Upgrade creates:

- `example_posts`
- `example_metrics`
- `example_embeddings`
- `rejected_patterns`
- `provider_configs`
- `generation_runs`
- `generation_steps`

Downgrade drops only these Phase 05 tables and leaves Phase 01-04 data intact.

## Security And Tenancy Impact

- Every new tenant-owned row includes `workspace_id`.
- Example, AI-run, and generation result reads are scoped through workspace membership.
- Cross-workspace example and AI-run IDs return `404`.
- Mutations require CSRF.
- Example and AI mutations are owner/admin/editor only.
- Provider adapters redact secrets and never persist API keys in source, logs, or responses.
- OpenAI payload logging stores metadata and structured results, not raw secrets.

## Implementation Order

1. Add Phase 05 plan and ADR.
2. Add models and migration.
3. Add provider interfaces and mock/OpenAI-ready adapters.
4. Implement example import, dedupe, approval, embedding, list/get/reject.
5. Implement retrieval and AI run logging.
6. Implement extract facts, assemble master, suggest hook, suggest ratings, quality check, cancel, retry.
7. Add Russian frontend technical AI/examples routes.
8. Generate OpenAPI and update smoke tests.
9. Run migration, seed, lint, typecheck, tests, e2e, spec validation, Docker rebuild/runtime smoke.

## Acceptance Evidence

- Example import deduplicates by normalized text hash.
- Approval creates embeddings.
- Generation retrieves at most eight approved examples.
- Master assembly records provider/model/usage metadata and creates a master revision.
- User-entered ratings override AI suggestions.
- Locked fact conflicts fail the AI run and do not create a master revision.
- Cross-workspace AI-run access returns `404`.

## Risks And Recovery

- Mock generation proves contracts and validation, not final editorial quality.
- OpenAI text and embedding adapters need live-smoke evidence before claiming provider quality.
- JSON-vector storage is acceptable for the technical slice; pgvector/HNSW indexing should be added after enough example volume exists.
- Synchronous API execution is acceptable for local Phase 05 checks; production should move heavy AI work to worker queues.

## Status

- 2026-06-20: Started after user confirmation to continue beyond Phase 04.
