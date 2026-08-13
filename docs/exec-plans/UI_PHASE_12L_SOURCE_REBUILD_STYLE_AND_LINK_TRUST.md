# UI Phase 12L — Source rebuild, style strength, and link trust

## Status

Implemented and locally verified on 2026-08-13. Production deployment and the owner-project rich-footer update are pending.

## Goal

Make a weak ready variant recoverable without leaving Nagovori:

`author source -> rebuild a new master from source -> retrieve stronger style context -> create new platform variants -> preserve every previous revision`.

The product must also distinguish a plain-text footer from a footer that actually contains links.

## Confirmed diagnosis

- The production `Rebuild` control called platform refinement and therefore edited the already weak variant instead of returning to the author's dictation.
- The `More humor` command added three local phrases but retained the old title, section composition, verdict, and ratings layout.
- The production project has 13 approved examples, but only two belong directly to `Fast review`; master assembly retrieved four examples and refinement retrieved three.
- Project humor rules reached the provider only inside a large truncated JSON block and were not presented as an explicit editorial objective.
- The production footer contains visible words for Telegram, MAX, the website, and other reviews, but `footer_rich_text` is absent; the UI nevertheless claimed that linked footer text was enabled.
- The author's latest manual Telegram revision is stored as an immutable revision and must not be overwritten by this phase.

## Product decisions

- Rename the result action to `Rebuild from dictation` and run the complete source-based master pipeline. Do not send the current platform text as the primary source of that action.
- Rebuild all currently selected platforms because they share the newly created master revision. Previous master and platform revisions remain available in history.
- Retrieve up to six approved examples for master assembly and up to five for platform refinement. Prefer rubric matches but allow strong project-wide examples when a rubric library is still small.
- Present project humor guidance as a separate, explicit prompt layer. If the configured guidance asks for a density or number of jokes, the model must satisfy it using only observations already present in the author source.
- Count only a complete short image, comparison, or personification with a recognizable comic turn as humor; vague filler is not a joke. When three or more accents are requested, spread them across at least three relevant parts of the post.
- Examples remain untrusted style-only references. They may teach composition, rhythm, and humor intensity but never contribute facts, topics, conclusions, or distinctive phrases.
- Remove paragraph-density and paragraph-compaction behavior from generated-text hygiene. Keep only lossless whitespace normalization and dash-pattern protection. The product must not merge or rearrange paragraphs behind the author's back.
- A footer is described as linked only when its rich-text document contains at least one valid HTTP(S) link mark. Otherwise show a warning that the footer is plain text and direct the owner to project rules.
- Copy confirmation may say `embedded links copied` only when the copied rich-text payload actually contains links.
- Learning from a final manual edit remains an explicit author decision through `Remember this edit`; saving a work-in-progress edit alone does not silently train the project.

## Backend scope

- Increase bounded example retrieval limits for `assemble_master` and `refine_variant` without changing the database schema.
- Add separate bounded humor instructions to master and refinement prompts and record the prompt contract through tests.
- Remove paragraph-fragmentation detection, compaction, and retry wording while preserving whitespace and dash hygiene.
- Block internal AI/editor commentary in ready prose with one bounded retry; provenance and verification notes stay in metadata and UI warnings.
- Keep the author-source boundary, locked-fact validation, immutable revisions, usage accounting, and last-good fallback unchanged.

## Frontend scope

- Route `Rebuild from dictation` through the existing recoverable full assembly flow, not `/platform-variants/{id}/refine`.
- Explain that a new master and selected platform variants will be created while prior revisions remain saved.
- Add `footerLinkCount` to the server view model and render accurate linked/plain footer status.
- Make copy feedback depend on actual link marks in the selected variant.
- Keep the explicit `Remember this edit` action prominent after manual editing.

## Preset and production configuration

- Update only the existing production project's footer as versioned rich text after deployment. Do not add project-specific destinations to the reusable preset or application code.
- After code verification, update the active production project through the versioned project API with the confirmed Telegram, MAX, and website URLs. Link `other reviews` to the public review index/root until a dedicated archive URL exists.
- Existing historical variants remain unchanged; newly rebuilt variants receive the current rich footer.

## Acceptance

- Clicking `Rebuild from dictation` creates a new master revision whose parent is the previous master and creates new variants for every selected platform.
- The provider request for the rebuild contains author source and approved style examples, but not the current manually edited variant as authoritative source.
- At least one same-rubric example is preferred when available; bounded fallback examples may come from the project library.
- Explicit humor guidance is present in master and refinement system prompts and examples remain marked `untrusted_style_only`.
- Ready output contains no internal `editorial suggestion`, `you can edit`, or `verify the text` commentary.
- No prompt, validator, or normalizer contains paragraph-fragmentation instructions or joins short paragraphs.
- A plain footer reports `footer added, links not configured`; a rich footer reports the exact link count.
- Copy success never claims links were copied when the payload contains zero link marks.
- The current production manual revision remains byte-for-byte unchanged after deploy and configuration update.
- PostgreSQL, Redis, their volumes, and Caddy are not recreated during deployment.

## Verification

- Backend prompt/retrieval, immutable-history, and non-blocking paragraph regression tests pass.
- The frontend contract checks source rebuild routing, the valid project-settings link, and truthful footer status.
- Final local results: backend `168/168`; editorial surface `16/16`; AI examples pipeline `15/15`; TypeScript and Web lint pass; UI hardening passes; the previously verified production Web build renders `35/35` pages; compileall and `git diff --check` pass.
- Regenerate OpenAPI only if an API DTO changes; this phase is designed not to require one.
- Run one live owner-workspace rebuild only after local tests, while preserving the existing manual variant and checking exact source facts against the result.

## Risks and rollback

- More examples increase prompt size and cost. Limits remain six/five and model routing does not change.
- Humor is inherently semantic; deterministic joke counting would create false positives. This phase strengthens the explicit prompt contract and validates with a real owner example instead of blocking output through brittle keyword rules.
- A full rebuild costs more than a local refinement. The label and help text make that boundary explicit.
- Rollback restores the previous stateless images and previous active project version. No schema downgrade or stateful-service restart is required.
