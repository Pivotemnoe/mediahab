# AI content engine

## Objective

Preserve the user’s facts and voice while automating structure, hooks, ratings, transitions, platform adaptation, and quality control. The system is not a generic “write anything” chat box. It is a deterministic editorial pipeline with versioned context and structured outputs.

The user's typed text, accepted voice transcript, explicitly confirmed import, and locked facts are authoritative substance. An AI idea may help the user decide what to say next, but its title, direction, speaking prompt, angle, brief, outline, questions, and internal content title are excluded from source manifests and master-generation input. Idea-only content is rejected before a provider call. This boundary applies to selection, refresh, resume, transcription, locking, cloning, and master assembly.

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

A standalone idea-direction run has a separate minimal manifest: task and contract
version, workspace, actor, provider/model, topic hash, and usage. Its `project_id`,
`rubric_id`, and `content_item_id` are null. The builder must not retrieve or include
projects, rubrics, examples, recent project titles, content items, or any other
workspace content.

## Task schemas

### Standalone idea directions

Input: exactly one non-empty, untrusted `topic`. The system treats the whole input as
a possible subject for posts, never as an instruction to answer, calculate, browse,
reveal instructions, or provide professional advice. There is no conversation
history, follow-up chat, free-form response channel, project, rubric, goal, example,
recent-title, or content-item context.

Output: exactly five materially distinct objects with only `id`, `title`, `direction`,
and `speaking_prompt`, under contract
`phase12j-standalone-idea-directions-v1`. `direction` describes what the author could
discuss; `speaking_prompt` is one question that asks for a real author detail. Output
is planning only: it is not an answer, post, recommendation, source text, quotation,
personal event, or conclusion.

Deterministic validation enforces the exact count and fields, non-empty length bounds,
stable IDs, one-line fields, obvious duplicates, and absence of URLs, prompt-like
instructions, unsupported names, numbers, dates, prices, quotations, and first-person
claims. Regulated medical, veterinary, psychological, fitness, legal, tax, and
financial requests may yield only editorial directions and questions for author facts
or later source verification, never mechanisms, diagnosis, triage, conclusions, or
advice. One invalid full batch receives one bounded retry inside the same run and
quota reservation; a second invalid batch is blocked in full.

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

Examples are enclosed and explicitly labeled as untrusted `style_only` references, not factual sources. They may guide register, sentence rhythm, paragraph density, humor intensity, transitions, and broad vocabulary preferences. They must not contribute a topic, thesis, fact, event, scenario, motif, metaphor, quotation, proper name, CTA, personal experience, or distinctive phrase sequence. Prompt context preserves their real paragraph structure; normalized text remains a retrieval/hash representation only.

## Generated-text hygiene

Every model-generated master, body block, hook, CTA, and platform refinement passes one product-wide prose normalizer and validator before persistence as ready text. User source, stored transcripts, imports, manual edits, rich text, URLs, code, and fixed boilerplate remain unchanged.

- Deterministically normalize CRLF, accidental tabs and separator non-breaking spaces, repeated horizontal whitespace, line-edge whitespace, leading/trailing blank lines, and more than one blank line between paragraphs.
- Reject doubled dash sequences `--`, `––`, and `——`, and paired parenthetical em-dashes such as `— aside —`. One grammatically necessary dash, dialogue markers, Markdown structure, code, URLs, and email addresses remain valid.
- Softly compact consecutive short one-sentence model paragraphs without changing their words. Paragraph density is never a blocking validation error.
- A surface violation receives one focused full-result retry. A second invalid response is blocked and never creates a ready master or platform revision; the last good revision is preserved.

## Retrieval

- Filter by workspace and project before vector search.
- Prefer same rubric.
- Combine vector similarity with manual quality and engagement.
- Do not retrieve rejected examples as positive style context.
- Save retrieval scores for debugging.
- Re-embed when normalized text or embedding model changes.

## Regression testing

### Standalone idea gate

The offline release-blocking gate validates
`fixtures/standalone-idea-eval.json` and the documented contract without calling a
live model. The frozen fixture contains exactly 8 topic-only probes spanning ordinary
topics, incomplete personal experience, user-supplied specifics, an unrelated
question, prompt injection, and regulated veterinary and legal topics. The checker
must reject project/rubric/example/recent-title dependencies, any response count other
than five, and any drift in the four output fields or binary review thresholds.

A live human gate is run only when the standalone prompt, model, or output/validator
contract changes, and before broad release of such a change. It runs the same 8 topics
once, producing 40 directions. One reviewer records one binary row per five-direction
batch; no model judge, style score, project matrix, seed matrix, or 100-row per-idea
sheet is required. Release passes only when all 8 responses are valid and contain exactly five
directions, all five in every batch are materially distinct and on the supplied topic,
and there are zero direct answers, unsupported facts or professional advice, invented
first-person/source-like claims, ready posts, or prompt disclosures. Automatic lexical
checks may flag obvious failures but cannot replace the batch-level semantic review.

### Project editorial pipeline

Create a versioned evaluation set per project:

- Source blocks.
- Locked facts.
- Expected required sections.
- Allowed fact set.
- Forbidden phrases.
- Target character range.
- Human-approved reference draft when available.

Tests should not demand exact prose. They must check facts, structure, length, forbidden patterns, rating scale, minimum style criteria, author-source provenance, and generated-text hygiene. The “У Доника” fixture is the first evaluation case.

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
