# Phase 05 — Examples and AI editorial pipeline

## Objective

Create a controlled editorial engine that uses project rules, rubric rules, relevant examples, and locked facts without becoming an unbounded generic generator.

## Deliverables

- Example import (manual, JSON, Telegram export), deduplication, metrics, review, approval/rejection, labels, embeddings, and pgvector retrieval.
- Separate TextGeneration, SpeechToText, and Embedding provider contracts.
- OpenAI, YandexGPT, and GigaChat text adapters; at least one live provider, others may be contract-complete mocks until credentials exist.
- Structured fact extraction and schema-validated provider output.
- Master assembly, three hook suggestions, editable 1–9 ratings, transitions, CTA, and section-level regeneration.
- Fact-lock comparison and unsupported-claim detection.
- Deterministic character/structure validation followed by optional AI quality evaluation.
- Generation logs: provider, model, prompt/config versions, retrieved example IDs, latency, token/usage/cost estimates, errors, and fallback chain.

## Non-goals

- Automatic publication.
- Fine-tuning a custom model in the initial release.

## Acceptance

- A generation uses normally 3–8 relevant approved examples, never the full library by default.
- User-provided ratings override AI suggestions.
- Missing evidence yields `null`/warning rather than invented details.
- Locked venue/address/check/dish/price changes produce a blocking failure.
- The result meets rubric length or clearly reports why it cannot.
