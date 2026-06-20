# Phase 04 — Content Studio, Media, And Voice

## Objective

Add the technical vertical slice for collecting source facts: content items, dynamic blocks, repeatable groups, autosave with optimistic concurrency, direct media-upload records, media ordering, voice transcription jobs, corrected transcript acceptance, and fact locking.

## Non-Goals

- AI master-post assembly, hook/rating generation, and platform variants.
- Publication, scheduling, or connector delivery.
- Heavy media transcoding.
- Final production visual design.

## Current-State Findings

- Phase 03 provides versioned projects, rubrics, input schemas, and the imported `chto-poest-armavir` preset.
- The `Обзор недели` rubric already has factual input fields and generated fields separated in preset data.
- No content/media/transcription tables or routes exist yet.
- Frontend pages are technical shells and must keep Russian visible copy.

## Assumptions And Open Questions

- Owners, admins, and editors may create/edit content and media; viewers are read-only.
- `content_items.max` is not seeded yet, so Phase 04 does not enforce a new content entitlement unless it appears later.
- Direct upload uses S3-compatible presigned URLs when S3 credentials are configured. Local development uses MinIO; mock presign remains only as a fallback when S3 is not configured.
- Mock transcription completes immediately. After user confirmation, the first live STT adapter is OpenAI transcription with Russian defaults.
- Offline queue is represented in the UI shell and API optimistic versioning; browser local persistence can be hardened later.

## Files And Modules

- Extend `services/api/app/db/base.py` with content/media/voice/transcription models.
- Add Alembic revision `202606200004_phase04_content_media_voice.py`.
- Add `services/api/app/modules/content` helpers for access checks, schema flattening, S3 presign generation, mock transcription, and OpenAI STT transcription.
- Add route module `services/api/app/api/v1/routes/content.py`.
- Add tests under `services/api/tests/test_content_media_voice.py`.
- Add Russian frontend routes under `/app/content`, `/app/content/new`, `/app/content/[contentId]`, and `/app/media`.
- Update OpenAPI, e2e smoke, ADR index, open questions, and Russian report.

## Database Migration And Rollback

Upgrade creates:

- `content_items`
- `content_blocks`
- `locked_facts`
- `content_revisions`
- `media_assets`
- `content_media`
- `voice_assets`
- `transcription_runs`

Downgrade drops these tables in reverse dependency order and leaves Phase 01-03 data intact.

## Security And Tenancy Impact

- Every new tenant-owned row includes `workspace_id`.
- Content and media object access is scoped through workspace membership.
- Cross-workspace content/media/block/job IDs return `404`.
- Mutations require CSRF.
- Editor role is allowed for content collection; owner/admin/editor only for mutations.
- Upload presign responses do not expose storage credentials and FastAPI never receives large media bytes.

## Implementation Order

1. Add Phase 04 plan and ADR.
2. Add models and migration.
3. Add content service helpers and route access checks.
4. Implement content-item CRUD, guided form, blocks, repeatable groups, lock/unlock, and revisions.
5. Implement media presign/complete/get/delete and content media ordering.
6. Implement mock transcription run, OpenAI STT provider, accept, and retry endpoints.
7. Add Russian frontend technical studio/media routes.
8. Generate OpenAPI and update smoke tests.
9. Run migration, seed, lint, typecheck, tests, e2e, spec validation, Docker rebuild/runtime smoke.

## Acceptance Evidence

- Imported `Обзор недели` guided form asks for venue/address/check, atmosphere, repeatable dishes, conclusion, and media.
- Guided form does not ask for generated hook/ratings/CTA fields.
- User can add repeatable dish blocks.
- Correcting transcription can update a block and lock the resulting factual value.
- Reload/read returns accepted blocks and media order from server state.
- Presign route returns an object-storage URL and no endpoint accepts raw video bytes.
- OpenAI STT can be selected with `STT_PROVIDER=openai` and reads uploaded audio from S3-compatible storage server-side.

## Risks And Recovery

- S3-compatible signing depends on correct provider endpoint, public upload endpoint, bucket policy, and CORS.
- OpenAI STT wiring is covered by adapter tests; live-provider quality and cost still require a controlled audio smoke with real credentials.
- UI remains technical; contracts and state model are the durable Phase 04 output.

## Status

- 2026-06-20: Started after Russian frontend correction and user confirmation to proceed to Phase 04.
- 2026-06-20: Extended after user confirmation to use existing Timeweb S3-compatible storage and OpenAI STT for the MVP path.
