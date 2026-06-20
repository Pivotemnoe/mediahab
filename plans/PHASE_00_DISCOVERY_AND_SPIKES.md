# Phase 00 — Discovery, ADRs, and platform spikes

## Objective

Remove high-risk assumptions before building the product.

## Tasks

1. Read all canonical documents and machine-readable policies.
2. Create ADRs for:
   - monorepo/package tooling;
   - browser authentication;
   - workspace isolation and future RLS;
   - transactional outbox;
   - S3 direct upload and delivery URLs;
   - AI/STT/embedding provider interfaces;
   - connector capability registry.
3. Scaffold a minimal repository only as needed for runnable spike scripts and tests.
4. Telegram spike:
   - render Rich HTML from the Donika fixture;
   - produce `<tg-collage>` with 7 photo and 3 video URLs;
   - validate 4,069 text characters;
   - live publish/edit/delete if credentials are supplied;
   - otherwise save payload snapshots and contract tests.
5. MAX spike:
   - render <=4,000 characters;
   - test upload/token/readiness flow;
   - test 10 mixed media if credentials are supplied;
   - record observed attachment capability.
6. Instagram readiness spike:
   - document account type, app, scopes, OAuth redirect, review status;
   - implement container payload builder and contract tests;
   - live single-image/carousel test only if approved credentials exist.
7. Create `docs/OPEN_QUESTIONS.md` with blockers and owner decisions.

## Acceptance

- No live success is claimed without returned external IDs/evidence.
- Documented limits and live-tested limits are stored separately.
- The Donika Rich Message payload is reproducible.
- ADRs are approved or explicitly pending.
- Phase report recommends whether any architecture assumption must change.
