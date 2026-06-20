# Phase 03 — Project and rubric builder

## Objective

Build the versioned no-code project constructor that makes the product reusable beyond the first preset.

## Deliverables

- Versioned Project, Rubric, InputSchema, RuleSet, Prompt, Template, and PlatformOverride models.
- Project wizard: from scratch, from preset, clone, import.
- Rubric builder with drag/drop ordering, required/optional fields, repeatable groups, custom blocks, editorial limits, generated fields, and AI mode.
- Dynamic form preview from JSON Schema plus UI schema.
- Project/rubric archive and restore; immutable historical versions.
- Import/export with schema validation and idempotency.
- “Что поесть? Армавир” preset imported from `presets/` as data.
- AI rubric suggestion endpoint behind a provider abstraction; mock implementation is acceptable in this phase.

## Non-goals

- Content generation.
- Social publication.

## Acceptance

- An owner creates a new unrelated project and rubric entirely from the UI.
- A custom repeatable block can be created without code changes.
- Changing a rubric creates a new version instead of mutating historical configuration.
- The food preset imports twice without duplication and matches the supplied rubric limits.
- No application branch checks for the preset slug to determine behavior.
