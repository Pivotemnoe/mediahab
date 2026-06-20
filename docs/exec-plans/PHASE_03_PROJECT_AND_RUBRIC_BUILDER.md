# Phase 03 — Project And Rubric Builder

## Objective

Build the versioned no-code project/rubric constructor so the product is not hardcoded to the first food-media preset. Phase 03 introduces project identities, immutable project/rubric versions, input schema storage, preset import/export, clone/archive/restore, and a mock AI rubric suggestion endpoint.

## Non-Goals

- Content item creation and guided dictation.
- Media upload, transcription, AI content generation, platform variants, or publication.
- Real AI provider calls; mock structured suggestions are enough in this phase.
- Final production visual design.

## Current-State Findings

- Phase 02 has auth, workspace membership, role checks, mock billing, and OpenAPI generation.
- Project/rubric tables do not exist yet.
- Preset YAML and JSON schemas already exist under `presets/` and `schemas/`.
- Frontend cabinet has technical Phase 02 pages but no project/rubric routes.

## Assumptions And Open Questions

- Owners and admins can create/update/archive projects and rubrics. Editors/viewers cannot manage constructor configuration in Phase 03.
- Entitlement check uses `projects.max` for active project creation/import/clone.
- Preset import is idempotent by `(workspace_id, preset_key)` / project slug and updates by creating new versions only if imported content changes.
- JSON Schema validation uses the checked-in schemas and `jsonschema`.
- The first UI remains technical and can be replaced later without changing API contracts.

## Files And Modules

- Extend `services/api/app/db/base.py` with project/rubric/schema/rule/prompt/template/platform override models.
- Add Alembic revision `202606200003_phase03_project_rubric_builder.py`.
- Add modules under `services/api/app/modules/projects`.
- Add route modules for `/workspaces/{workspace_id}/projects`, `/projects`, `/rubrics`, and mock suggestions.
- Add API tests under `services/api/tests`.
- Add frontend routes under `/app/projects`, `/app/projects/new`, `/app/projects/[projectId]`, `/app/projects/[projectId]/builder`, and `/app/projects/[projectId]/rubrics`.
- Update OpenAPI, smoke tests, and Russian report.

## Database Migration And Rollback

- Upgrade creates stable parent tables plus immutable version tables:
  - `projects`, `project_versions`
  - `input_schemas`
  - `rubrics`, `rubric_versions`
  - `project_rules`, `rule_versions`
  - `prompts`, `prompt_versions`
  - `templates`, `template_versions`
  - `platform_overrides`
  - `rubric_suggestions`
- Unique constraints enforce slug/version and idempotent preset imports.
- Downgrade drops Phase 03 tables in reverse dependency order.

## Security And Tenancy Impact

- Every tenant-owned row has `workspace_id`.
- Routes scope projects/rubrics through workspace membership.
- Cross-workspace project/rubric IDs return `404`.
- Constructor mutations require CSRF and owner/admin role.
- Active project creation/import/clone checks `projects.max` on backend.

## External API And Live-Test Prerequisites

No external API is called. AI rubric suggestions use a deterministic mock provider and return drafts only.

## Implementation Order

1. Add Phase 03 execution plan and ADR.
2. Add models, migration, and services for schema conversion/checksum/versioning.
3. Add project CRUD, from-preset/import/export/clone/archive/version routes.
4. Add rubric CRUD, form-schema/validate-schema/archive/restore/clone/version routes.
5. Add rule/prompt/template skeleton tables and minimal version helpers where needed.
6. Add mock AI suggestion routes.
7. Add technical frontend project/rubric routes.
8. Generate OpenAPI and update smoke tests.
9. Add tests for versioning, repeatable groups, preset idempotency, entitlements, cross-workspace access, and no slug-branch behavior.
10. Run migrations, seed, lint/typecheck/test/e2e/spec validation.

## Tests And Checks

- API integration tests with temporary SQLite DB.
- Migration/seed on local Postgres.
- OpenAPI export.
- Frontend typecheck.
- Spec validation.
- Docker rebuild and runtime smoke.

## Demo And Acceptance Evidence

- Owner can create a non-food project and custom repeatable rubric through API and technical UI route shell.
- Updating a rubric creates a new immutable version.
- Preset import can run twice without duplicate projects/rubrics.
- Imported `Обзор недели` rubric keeps editorial max `4100`.
- Cross-workspace project/rubric access returns `404`.

## Risks And Recovery

- Full drag/drop UI is deferred; backend persists ordering and route shell makes the next UI pass straightforward.
- Rule/prompt/template UI is skeletal in Phase 03; tables and version patterns are in place.
- Future content items must reference exact project/rubric version IDs, not stable parents.

## Status

- 2026-06-20: Started after user confirmed transition from Phase 02 to Phase 03.
