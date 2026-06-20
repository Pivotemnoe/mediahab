# AI content engine

## Objective

Preserve the user’s facts and voice while automating structure, hooks, ratings, transitions, platform adaptation, and quality control. The system is not a generic “write anything” chat box. It is a deterministic editorial pipeline with versioned context and structured outputs.

## Provider interfaces

```python
class TextGenerationProvider(Protocol):
    async def generate_structured(self, request: StructuredGenerationRequest) -> StructuredGenerationResult: ...
    async def generate_text(self, request: TextGenerationRequest) -> TextGenerationResult: ...
    async def healthcheck(self) -> ProviderHealth: ...

class SpeechToTextProvider(Protocol):
    async def transcribe(self, request: TranscriptionRequest) -> TranscriptionResult: ...

class EmbeddingProvider(Protocol):
    async def embed(self, texts: list[str], model: str | None = None) -> EmbeddingResult: ...
```

Implement adapters, not provider-specific calls inside business modules.

## Context assembly

The prompt/context builder resolves exact versions and emits a traceable context manifest:

```json
{
  "project_version_id": "...",
  "rubric_version_id": "...",
  "rule_version_ids": ["..."],
  "prompt_version_ids": ["..."],
  "example_ids": ["..."],
  "locked_fact_hash": "...",
  "platform_policy_version": "..."
}
```

Store the manifest with the generation run.

## Task schemas

### Fact extraction

Input: corrected transcript or text blocks.  
Output: structured fields matching the rubric schema, provenance for each value, uncertainty list, and no prose outside the schema.

### Master assembly

Output includes:

- `body_blocks`
- `hook_candidates` (normally 3)
- `ratings_suggestion`
- `cta_candidate`
- `fact_usage_map`
- `warnings`

The UI may auto-select the highest-ranked hook but must show alternatives.

### Ratings suggestion

Ratings are explicitly marked suggestions and include short evidence grounded only in source facts. If the user supplied a rating, return it unchanged with source `user`.

### Platform adaptation

Input includes approved master revision and connector policy. Output is a separate draft, not an in-place modification. Required strategies:

- `preserve_full`: retain content within target.
- `compress`: summarize while preserving verdict and key facts.
- `micro_post`: create a short hook/verdict/CTA.
- `metadata_package`: produce structured YouTube metadata.

### Quality evaluation

Return machine-readable findings:

```json
{
  "errors": [{"code": "fact_conflict", "field": "price", "message": "..."}],
  "warnings": [{"code": "weak_hook", "message": "..."}],
  "scores": {
    "fact_fidelity": 1.0,
    "style_match": 0.86,
    "structure": 0.95
  }
}
```

Do not rely on a model score alone for length, required fields, or locked-fact equality; those use deterministic validators.

## Prompt layering

Recommended order:

1. System role and strict output schema.
2. Non-invention and fact-lock policy.
3. Project voice/rules.
4. Rubric structure and editorial range.
5. Retrieved approved examples.
6. Rejected patterns and forbidden phrases.
7. Locked facts and source blocks.
8. Current task.

Examples are enclosed and explicitly labeled as style references, not factual sources.

## Retrieval

- Filter by workspace and project before vector search.
- Prefer same rubric.
- Combine vector similarity with manual quality and engagement.
- Do not retrieve rejected examples as positive style context.
- Save retrieval scores for debugging.
- Re-embed when normalized text or embedding model changes.

## Regression testing

Create a versioned evaluation set per project:

- Source blocks.
- Locked facts.
- Expected required sections.
- Allowed fact set.
- Forbidden phrases.
- Target character range.
- Human-approved reference draft when available.

Tests should not demand exact prose. They must check facts, structure, length, forbidden patterns, rating scale, and minimum style criteria. The “У Доника” fixture is the first evaluation case.

## Failure behavior

- Provider timeout: retry according to task policy, then fallback provider if configured.
- Invalid schema: one repair attempt with the same provider; then fallback or visible failure.
- Fact conflict: never auto-repair silently; block and show comparison.
- Target length miss: allow one focused revision pass, then expose the draft and warning.
- Provider unavailable in region: mark health and use configured fallback.

## User controls

Per project/rubric:

- AI mode: editor, author, adapter.
- Editing strength.
- Humor level.
- Provider/model preference.
- Creativity/temperature where supported.
- Number of hook alternatives.
- Auto-suggest ratings on/off.
- Example retrieval on/off and maximum examples.
- Advanced prompt editor behind an expert toggle.

## Privacy

Provider request logging stores hashes and redacted diagnostics by default, not raw secrets. Workspace settings later may define whether raw prompt/output retention is allowed. Never send unrelated examples or data from another workspace.
