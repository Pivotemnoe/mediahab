# ADR 0006 — AI, STT, and Embedding Provider Interfaces

Date: 2026-06-20
Status: accepted on 2026-06-20

## Context

The product needs text generation, speech-to-text, embeddings, and possibly moderation. Providers differ in structured-output support, regional availability, pricing, latency, and model behavior.

## Decision

Keep separate provider families:

- `TextGenerationProvider`
- `SpeechToTextProvider`
- `EmbeddingProvider`
- optional `ModerationProvider`

Each provider family has capability descriptors, configuration, health checks, fallback order, usage logs, and task-specific model IDs. Business logic consumes interfaces, not provider SDK calls.

## Consequences

- OpenAI, YandexGPT, GigaChat, SpeechKit, and local-compatible providers can be tested independently.
- Structured AI output is schema-validated and repaired at most once before visible failure.
- Usage accounting can later drive entitlements and billing.
