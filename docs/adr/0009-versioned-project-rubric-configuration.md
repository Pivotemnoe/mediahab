# ADR 0009 — Versioned Project And Rubric Configuration

Date: 2026-06-20
Status: accepted for Phase 03 implementation

## Context

The product must be reusable beyond the first “Что поесть? Армавир” preset. Projects, rubrics, rules, prompts, templates, field schemas, editorial limits, generated fields, and platform overrides must be database-driven. Historical content will later need to render and validate against the exact configuration version used at creation time.

## Decision

Use stable parent rows for identity and lifecycle, with immutable version rows for configuration snapshots:

- `projects` + `project_versions`
- `rubrics` + `rubric_versions`
- `input_schemas`
- `project_rules` + `rule_versions`
- `prompts` + `prompt_versions`
- `templates` + `template_versions`

Updates create a new version row and move the stable parent `active_version_id`. Historical version rows are never updated by normal application paths.

Preset import reads YAML/JSON preset data and stores it through the same versioning services used by user-created projects. The application must not branch on the food preset slug to determine behavior.

## Alternatives Considered

- Mutating project/rubric rows in place: rejected because content items would lose historical configuration.
- Hardcoding preset behavior by slug: rejected by the canonical specification.
- Storing only raw YAML blobs: rejected because the builder and future content studio need queryable stable IDs and schema references.

## Consequences

- Project/rubric update endpoints are slightly more verbose because they create version rows.
- Future content items can safely reference exact `project_version_id` and `rubric_version_id`.
- Preset import can be idempotent while still creating new versions when preset data changes.
- API tests must assert that old version rows remain unchanged.

## Migration And Rollback

Phase 03 migration adds project constructor tables. Rollback drops these tables only and leaves Phase 01/02 identity and billing state intact.

## Evidence

Phase 03 acceptance requires passing tests for project creation, rubric repeatable groups, version creation, preset idempotency, cross-workspace access, and backend entitlement enforcement.
