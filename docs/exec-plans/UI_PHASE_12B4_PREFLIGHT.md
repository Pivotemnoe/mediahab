# UI Phase 12B.4 — Result preflight

Status: implemented and verified locally on 1 August 2026. Production remains unchanged.

## Goal

Add a compact preflight summary to each existing platform result in the simple voice composer. The summary covers length, media, format, and delivery readiness without creating another screen or changing the publication architecture.

## Assumptions and boundaries

- A project remains required and a rubric remains optional.
- Every platform keeps its own `PlatformVariant`; an error for one platform must not remove successful results for other platforms.
- The preflight is a saved snapshot inside `PlatformVariant.validation`; it does not approve or publish the variant.
- Account credentials and destinations are not selected in the simple composer. Therefore the delivery check must say that readiness is unverified or that manual export is required; it must not claim a live account is ready.
- Human confirmation remains mandatory before publication.
- No database migration, new top-level route, secret change, connector activation, or production deployment is included.

## API contract

`PlatformVariant.validation.preflight` contains:

- `status`: `pass | warning | block`;
- `checks`: four ordered entries for `length`, `media`, `format`, and `delivery`;
- each entry contains a stable `key`, `status`, `code`, Russian `label`, and Russian `message`.

The snapshot is produced when a variant is created and recomputed when it is explicitly validated. Existing `valid`, `errors`, `warnings`, limits, and payload fields remain compatible.

## UI

- Render the preflight inside the active result card, before the generated text.
- Show a visible status word and explanatory text for every check; color is supplementary only.
- Use an accessible labelled status region with polite live updates and keyboard focus support.
- Keep the existing independent per-platform result state and controls.

## Tests

- Unit-test blocking hard limits, Instagram format/media readiness, and VK manual-export readiness.
- Integration-test that generated and edited variants contain the saved preflight snapshot.
- Run API tests, repository tests, frontend lint, TypeScript checking, production build, and responsive checks at 390 px and 1440 px.

## Risks and rollback

- Risk: presenting connector capability as a verified account. Mitigation: delivery is a warning until a concrete destination is checked; manual destinations explicitly say manual export.
- Risk: legacy clients omit Instagram format. Mitigation: preserve API compatibility and report the format as needing review rather than rejecting the request.
- Rollback: remove the additive `validation.preflight` snapshot and its UI block. No schema or stored content migration is required.

## Verification results

- Focused preflight unit tests: 5 passed.
- Focused Instagram/VK integration tests: 8 passed.
- Full API suite: 81 passed; repository suite: 5 passed.
- `make lint`, `make typecheck`, `make openapi`, and the Next.js production build passed.
- Local browser checks at 390 × 844 and 1440 × 900 found no horizontal overflow.
- No database migration was required. Production, secrets, and live destinations were not changed.
