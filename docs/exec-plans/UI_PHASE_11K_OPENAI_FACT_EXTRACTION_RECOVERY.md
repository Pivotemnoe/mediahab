# UI Phase 11K — OpenAI Fact Extraction Recovery

## Goal

Fix the pilot flow where accepted voice transcriptions reach the backend, but the AI assembly block shows `OpenAI text generation returned HTTP 400` and does not prepare a master draft.

## Trigger

The owner dictated several blocks, selected atmosphere, venue, and conclusion, accepted the transcriptions, then pressed the AI assembly action. The UI showed an OpenAI HTTP 400 error in `ИИ-сборка и версии`.

## Findings

- Production logs show three successful OpenAI STT calls.
- The accepted transcriptions updated content blocks successfully.
- The failure happens later in OpenAI `/v1/responses` structured generation.
- The current fact extraction schema exposes `facts` as a free-form object, which is incompatible with strict OpenAI Structured Outputs requirements for closed objects.
- The full draft action runs fact extraction before master assembly, so a fact extraction 400 blocks the visible "prepare master and first version" flow.

## Scope

- Add an OpenAI-safe fact extraction schema with `facts` as a closed array of key/value records.
- Normalize that provider payload back to the existing API response shape where `response_json.facts` is an object.
- Keep frontend API contracts unchanged.
- Add a source-data fallback for `assemble_master` when the text provider fails, so accepted user material can still produce a master revision.
- Improve tests for provider schema normalization and master fallback behavior.

## Out of Scope

- Changing OpenAI model choice or production secrets.
- Changing STT flow.
- Changing publication connector behavior.
- Adding background queues for AI tasks.
- Reworking the visual layout.

## Tests

- `make typecheck`
- `make lint`
- web build
- `make test`
- targeted API tests for:
  - fact extraction provider schema normalization;
  - master assembly provider failure fallback.
- `make validate-spec`
- `git diff --check`

## Migrations

No database migration is expected. Existing `generation_runs.response_json` remains compatible.

## Risks

- Fact extraction output becomes more constrained for OpenAI, so the prompt/schema must keep enough room for arbitrary field values via JSON strings.
- Master fallback creates an acceptable draft from user-provided data even if OpenAI fails; this is safer than blocking, but the UI should still surface a warning in quality metadata.

## Rollback

Revert the AI schema/normalization changes, tests, this execution plan, and the phase report.
