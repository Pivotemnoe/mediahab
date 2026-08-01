# Phase 12B.1: platform length targets

Status: implemented and verified locally; production not changed
Date: 1 August 2026
Scope: existing Voice First composer and existing project/rubric settings; no new top-level screens, publication, deployment, or production changes

## Objective

Add editable, versioned editorial length targets for Telegram, MAX, VK, and Instagram at project and optional-rubric level. Let a user override the target for the current material without mutating project or rubric configuration. Resolve the applied target in this order:

`current material override -> rubric target -> project target -> system profile`.

Connector hard limits remain immutable safety constraints and are never presented as editorial targets.

## Assumptions and data shape

- No database migration is required. `ProjectVersion.character_count_policy` and `RubricVersion.platform_overrides` are already versioned JSON columns.
- Project targets are stored under `character_count_policy.platform_targets`.
- Rubric targets are stored under `platform_overrides.length_targets`.
- Current-material overrides are sent with the variant-generation request and snapshotted into each platform variant payload.
- A target is `{min_chars, max_chars}`. Both values are optional in inherited configuration, but an explicit current-material range requires valid positive bounds with `min_chars <= max_chars`.
- MAX and Instagram target maxima cannot exceed connector hard limits. Telegram and VK retain separate connector capabilities.

## API and application changes

1. Expose `character_count_policy` in `ProjectOut` and `platform_overrides` in `RubricOut`.
2. Extend `GenerateVariantsRequest` with `length_overrides` keyed by platform.
3. Add a shared resolver that validates configuration, applies inheritance, clamps inherited unsafe targets to the connector hard maximum, and records `source`, target bounds, and hard limit.
4. Store the resolved target snapshot in `PlatformVariant.payload.length_target`.
5. If the same master revision is regenerated with a different override, create a new platform revision instead of returning the prior target snapshot.
6. Add platform-specific target controls to the existing project and rubric rules forms.
7. Add the compact `Длина этого поста` control to the existing composer. Profiles map to safe editorial ranges; exact values may be copied to Telegram, MAX, and VK.
8. When an explicit post/rubric/project target is missed, run one target-aware platform refinement through the existing AI editor. It works from the full source, preserves the previous revision, and never adds the permanent footer itself.
9. Show the resolved target, its source, actual count, and an honest warning when the result still misses the range.

## Tests

- Unit tests for inheritance, invalid ranges, and hard-limit clamping.
- API tests that project/rubric output includes the versioned configuration.
- Publication integration tests that current overrides are snapshotted and a changed override creates a new variant revision without duplicating the content item.
- Frontend type checking and production build.
- Responsive browser smoke at 390 px and 1440 px on the existing composer.

## Risks and mitigations

- Existing JSON may have unrelated keys: merge nested objects instead of replacing them.
- A permanent footer contributes to the connector hard limit: validation continues to use final rendered text; target metadata describes the editorial goal.
- AI may still miss a requested range after one attempt: do not loop indefinitely or silently truncate. The result remains editable/refinable and shows the actual count beside the target.
- Current-material overrides are build snapshots, not project/rubric mutations.

## Rollback

Revert the API fields, resolver, UI controls, and tests. Existing JSON and variant payload additions are backward compatible and require no data rollback.
