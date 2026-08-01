# Phase 12B.2: Instagram formats

Status: implemented and verified locally
Date: 1 August 2026
Scope: the existing Voice First composer and platform-variant payload; no new top-level screen, automatic publication, deployment, or production change

## Objective

When Instagram is selected, require one explicit format in the normal composer:

- `image`: one ready image or video and one caption;
- `carousel`: 2-10 ready images/videos, preserving the selected order and using the first item as cover;
- `reel`: one ready video, plus caption/script/cover guidance metadata.

The selected format is a build snapshot. It does not mutate project or rubric rules.

## Data and API

- Extend `GenerateVariantsRequest` with optional `instagram_format: image | carousel | reel`.
- Existing direct API callers that omit it retain the legacy Phase 09 behavior; the new simple composer always supplies it and does not allow an Instagram build without selection.
- Validate media count/type whenever the new field is supplied.
- Store `instagram_format`, ordered media summary, and cover media id in `PlatformVariant.payload`.
- No database migration is required because the payload is already JSON and media order already exists in `ContentMedia`.

## UI

- Show the format cards only while Instagram is selected.
- Default to no choice so the user makes the publishing intent explicit.
- Explain the required media count in plain Russian.
- Disable `Собрать версии` and show an actionable message until the selected format and attached media are compatible.
- Show the chosen format in the Instagram result.

## Tests

- Unit/integration tests for image, carousel, reel, missing media, wrong media type, and payload snapshot.
- Frontend typecheck/build.
- Responsive smoke at 390 px and 1440 px.

## Result

- The existing composer now requires `image`, `carousel`, or `reel` only when Instagram is selected and blocks the build with an actionable Russian message until media is compatible.
- Photo and MP4/MOV upload uses the existing media route. The selected format, ordered media snapshot, and cover media id are retained through manual edits and AI refinement revisions.
- Instagram receives one format-aware refinement: caption for a single post, caption plus ordered card plan for a carousel, or hook/script/caption/cover guidance for Reel. The fixed project footer remains application-managed.
- Existing API callers that omit `instagram_format` retain the Phase 09 behavior.

Verification on 1 August 2026:

- `make typecheck` — passed;
- `make lint` — passed;
- `make openapi` — passed, both checked-in OpenAPI artifacts regenerated;
- `make test` — passed, including 76 API tests and 5 repository tests;
- `pnpm --filter @temichev/web build` — passed, 32 static pages generated;
- local in-app browser smoke — passed at 390 px and 1440 px, no horizontal overflow, picker visible, incompatible Reel build disabled.

No database migration was required. Production was not changed.

## Risks and rollback

- Existing Phase 09 connector tests use legacy API requests; compatibility is retained while the normal PWA adopts the stricter contract.
- Media processing readiness is still governed by existing media state; only attached, non-deleted assets participate.
- Rollback removes the request field, payload metadata, validation, and UI block. No stored-data rollback is required.
