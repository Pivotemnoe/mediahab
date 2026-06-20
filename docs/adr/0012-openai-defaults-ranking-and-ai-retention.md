# ADR 0012 — OpenAI Defaults, Example Ranking, And AI Retention

Date: 2026-06-20
Status: accepted for provider/model/ranking decisions; retention is a recommended pilot default pending final owner confirmation

## Context

Phase 05 shipped provider boundaries for text generation and embeddings with deterministic mocks for tests. The owner confirmed that OpenAI should be the first live provider for the personal pilot, while automated tests must remain deterministic and free of external paid calls.

## Decision

Use OpenAI as the default live text and embedding provider:

- `AI_TEXT_PROVIDER=openai`
- `OPENAI_TEXT_MODEL=gpt-4.1-mini`
- `EMBEDDING_PROVIDER=openai`
- `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`

Keep `mock` providers available for tests and local contract checks by explicit test settings.

Keep the Phase 05 example-ranking formula as the initial default: workspace/project scope, approved examples only, same-rubric boost, semantic similarity, manual quality, engagement signals, recency, and rejected-pattern penalties.

Recommend the following AI data-retention defaults for the pilot:

- Raw prompts: 30 days.
- Raw model outputs that are not accepted as content revisions: 90 days.
- Accepted master revisions and user-approved generated content: retained with the content item lifecycle.
- Usage, latency, provider, model, status, and error metadata: 365 days.
- Embeddings: retained while the approved example exists; deleted when the example is deleted or permanently rejected.
- Redacted diagnostics and hashes may be retained for 365 days.

`Forbidden phrases` means an internal project library of banned phrases and regex patterns, not an external package. It is backed by the `rejected_patterns` data model and will be filled with project-specific phrases for “Что поесть? Армавир”.

## Alternatives Considered

- Full `gpt-4.1`: rejected for pilot defaults because the cost is higher than needed for first live tests.
- `gpt-4.1-nano`: deferred because editorial style, structure, and fact discipline are more important than the absolute cheapest text model at this point.
- Permanent raw prompt/output storage: rejected because raw prompts may contain sensitive unpublished notes and source material.
- Immediate deletion of prompts/outputs: rejected because debugging quality issues and billing disputes needs short-term evidence.

## Consequences

- Production-like configuration uses OpenAI by default once `OPENAI_API_KEY` is provided.
- Automated tests remain deterministic and do not require OpenAI credentials.
- Live AI calls will return provider configuration errors until `OPENAI_API_KEY` is set in the runtime environment.
- Retention implementation still needs owner confirmation and scheduled cleanup jobs before production launch.

## Evidence

OpenAI model documentation lists `gpt-4.1-mini` as a smaller, faster GPT-4.1 model with structured outputs support and pricing of $0.40 input / $1.60 output per 1M tokens. OpenAI embedding documentation lists `text-embedding-3-small` as the small embedding model, priced at $0.02 per 1M tokens.
