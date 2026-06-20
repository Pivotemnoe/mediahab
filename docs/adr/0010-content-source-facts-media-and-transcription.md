# ADR 0010 — Content Source Facts, Media, And Transcription

Date: 2026-06-20
Status: accepted for Phase 04 implementation

## Context

The product must collect factual source material before AI assembly. User-entered facts, corrected transcripts, media order, and locked values must survive reloads and later AI steps. Large image/video/audio files must not pass through FastAPI memory.

## Decision

Store source material in `content_items` and `content_blocks`, with exact project/rubric version references on every content item. Blocks keep field keys, repeatable group keys/indexes, source provenance, transcript text, lock state, source media, and revision numbers.

Confirmed facts are normalized into `locked_facts`. User correction or explicit lock creates or updates a locked fact for the block key. Future AI validators must compare generated output against these locked facts.

Media uses `media_assets` plus `content_media` ordering. The API creates upload records and returns presigned object-storage URLs; browser clients upload bytes directly to object storage. The API only receives metadata and completion confirmation.

Transcription uses `transcription_runs` with provider metadata and status. Phase 04 ships a deterministic mock provider plus an OpenAI STT adapter for the confirmed MVP live path. The adapter reads uploaded audio from S3-compatible storage server-side and stores sanitized provider metadata with the run.

## Alternatives Considered

- Storing all source data only as one JSON blob on `content_items`: rejected because repeatable groups, provenance, locks, and per-field concurrency need queryable rows.
- Uploading media through FastAPI: rejected by the specification because large video data must not pass through API process memory.
- Treating transcript text as final facts automatically: rejected because the user must correct and accept transcripts before facts are locked.

## Consequences

- Later AI assembly can reference immutable project/rubric versions and locked facts.
- Reload recovery is server-backed rather than only browser-local.
- Object storage signing remains replaceable without changing content/media contracts.
- Local development uses MinIO with the same S3-compatible flow; the MVP production path can point the same settings at Timeweb S3.
- Mock transcription is useful for workflow tests; OpenAI STT requires real credentials and controlled audio smoke before quality claims.

## Migration And Rollback

Phase 04 migration adds content, media, voice, and transcription tables. Rollback drops only Phase 04 tables and leaves projects/rubrics/auth/billing state intact.

## Evidence

Phase 04 acceptance requires tests for guided `Обзор недели` fields, repeatable dish blocks, optimistic autosave conflicts, transcript correction and lock, cross-workspace 404, media ordering persistence, and presigned upload metadata without raw file upload through FastAPI.
