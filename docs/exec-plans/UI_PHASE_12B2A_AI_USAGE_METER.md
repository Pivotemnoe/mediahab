# Phase 12B.2a: AI usage meter

Status: implemented and verified locally
Date: 1 August 2026
Scope: the existing Voice First composer and existing generation-run accounting; no new screen, billing mutation, deployment, or production change

## Objective

After a text build or refinement, show the owner an understandable usage estimate:

- input tokens;
- output tokens;
- total tokens;
- estimated provider cost in USD.

The meter is an operational estimate for product economics. It is not an invoice and must not be presented as the amount charged to a customer.

## Data and API

- Reuse `GenerationRun.input_tokens`, `output_tokens`, `input_characters`, `output_characters`, and `cost_estimate_micro_usd`.
- Add token fields to the existing platform-refinement response so the composer can aggregate all calls in one build.
- Prefer provider token usage. When tokens are missing but character counts exist, estimate Russian text tokens conservatively as `ceil(characters / 4)` and label the result approximate.
- Do not add a migration and do not change subscription usage or prices.

## UI

- Add one compact `Расход ИИ на последнюю операцию` block below existing platform results.
- Keep input, output, total, and USD estimate visible on mobile without a table.
- Explicitly state that transcription and future image analysis are not included in the text-token number.

## Tests and rollback

- Cover exact provider usage, character fallback, aggregation, and refinement response fields.
- Run lint, typecheck, API tests, web build, and responsive smoke.
- Rollback removes the response fields and UI block; stored generation runs remain unchanged.

## Result

- The composer aggregates all completed generation runs involved in the latest full build or explicit refinement.
- Provider tokens are shown when present; otherwise input/output character counts are converted with the documented approximate rule and marked `примерно`.
- The block shows input, output, total tokens, and provider-cost estimate. It explicitly excludes transcription and image analysis from the text-token total.
- Refinement API responses now include token and character usage. No migration was required.

Verified on 1 August 2026: `make openapi`, `make lint`, `make test` (78 API tests plus 5 repository tests), Next.js production build, and responsive smoke at 390/1440 px. Production was not changed.
