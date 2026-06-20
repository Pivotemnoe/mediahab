# ADR 0011 — Examples, Retrieval, And AI Runs

Date: 2026-06-20
Status: accepted for Phase 05 implementation

## Context

The product needs an editorial AI pipeline that preserves source facts and project voice. It must use approved examples as style references, not as factual sources, and every machine-consumed AI response must be structured and validated.

## Decision

Store imported examples in `example_posts` with dedupe hashes, review status, labels, metrics, and optional rubric links. Approved examples receive embeddings in `example_embeddings`. Retrieval filters by workspace and project, prefers same-rubric examples, ranks a small candidate set, and returns at most eight examples per generation.

Store every AI task in `generation_runs` with provider key, model, task type, context manifest, retrieved example IDs, usage, latency, response JSON, and errors. Store stage metadata in `generation_steps`.

Phase 05 adds provider interfaces for text generation and embeddings. OpenAI text generation and embedding adapters are implemented behind environment variables, with deterministic mock providers retained for automated tests. YandexGPT and GigaChat remain contract-complete mocks until credentials and production settings are approved.

Master assembly creates a `content_revisions` row of type `master` only after structured output validation and deterministic fact-lock validation pass. If a locked fact is changed, the run fails and no master revision is created.

## Alternatives Considered

- Retrieving the full example library for every generation: rejected because it violates the spec, increases cost, and mixes unrelated style contexts.
- Storing prompts and outputs only in logs: rejected because generation history must support billing, debugging, and user-visible retry/review.
- Using free-form model text and parsing it later: rejected because hooks, ratings, warnings, and fact usage must be schema-validated.
- Adding pgvector-specific ORM types immediately: deferred so SQLite acceptance tests remain simple; the API contract does not depend on the storage representation.

## Consequences

- AI behavior is inspectable and testable without live provider access.
- OpenAI can be enabled by configuration without changing content business code.
- User-provided ratings can be preserved and proven in tests.
- Fact conflicts are blocking and visible.
- Production performance will need worker orchestration and pgvector indexing once the library grows.

## Migration And Rollback

Phase 05 migration adds example, provider config, generation run, and generation step tables. Rollback drops only those tables and does not modify content items, locked facts, media, auth, billing, or project/rubric data.

## Evidence

Phase 05 acceptance requires tests for example dedupe and embeddings, retrieval capped to eight examples, master revision creation, user rating override, locked fact conflict blocking, and cross-workspace AI-run isolation.
