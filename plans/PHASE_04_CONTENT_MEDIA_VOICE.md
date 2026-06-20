# Phase 04 — Content Studio, media, and voice

## Objective

Let a user collect factual material by typing or dictating, upload/reorder media, correct transcription, and preserve immutable source facts.

## Deliverables

- ContentItem, ContentBlock, ContentRevision, MediaAsset, MediaRelation, VoiceAsset, and TranscriptionRun models.
- Guided form generated from the selected rubric version.
- Autosave with optimistic concurrency, recovery after reload, and visible conflict handling.
- Repeatable dish/item groups.
- Browser voice recorder, direct S3 upload, background transcription interface, mock provider, and one live provider when credentials exist.
- Corrected transcript and field extraction review.
- Fact origin (`user`, `transcription`, `import`, `ai`, `system`) and locked state.
- Direct presigned upload for image/video/audio, media ordering, metadata, validation, and cleanup of abandoned uploads.

## Non-goals

- Final AI post assembly.
- External publication.

## Acceptance

- Selecting “Обзор недели” asks for venue/address/check, atmosphere, repeatable dishes, conclusion, and media; it does not ask the user to invent a hook or ratings.
- User correction locks factual values.
- Reloading or reconnecting does not lose accepted blocks or media order.
- Large video data does not pass through FastAPI process memory.
