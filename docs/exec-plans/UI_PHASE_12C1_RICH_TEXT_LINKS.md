# UI Phase 12C.1 - Constrained Rich Text Links

## Status

Implemented and accepted locally on 2026-08-01. Production requires a separate owner confirmation.

## Objective

Let a user select any word or phrase in a ready platform version or the reusable project footer, attach a safe URL, and copy the result with embedded links for Telegram-compatible rich paste. Keep the current simple voice-first flow, immutable platform revisions, deterministic footer application, platform limits, and human approval.

## Product decisions and assumptions

1. Source transcription remains plain text. Rich formatting is available only in ready platform variants and the reusable footer.
2. The stored document is constrained JSON, never arbitrary HTML. Version 1 allows plain text plus `link`, `bold`, and `italic` marks.
3. Link URLs must use `https://` or `http://`; unsafe schemes are rejected by both API and UI.
4. `PlatformVariant.text` and `rendered_text` remain the canonical plain-text fallback used for character limits and connectors that do not support rich text.
5. Variant formatting is stored in the immutable revision's `payload_json`. Editing creates a new platform revision and keeps the old document unchanged.
6. The reusable footer keeps `footer_template` as a plain fallback and stores its structured counterpart in versioned `cta_config.footer_rich_text`.
7. AI rebuilds do not remap body links to rewritten words. A new AI body starts as plain text; the current reusable footer is reapplied with its links.
8. Rich clipboard writes `text/html` and `text/plain`; unsupported browsers fall back to plain clipboard text.
9. Telegram and MAX renderer helpers may consume the same structured document. Other destinations retain safe plain text until their connector explicitly supports formatting.
10. The first toolbar is intentionally limited to link/unlink, bold, italic, undo, and redo.

## Data and API

- No table migration: use existing versioned JSON columns.
- Define a shared validated rich-text schema and normalizer in the API.
- Extend platform-variant edit requests with an optional rich-text document. The API derives and verifies its plain text instead of trusting duplicate client strings.
- Return rich-text data inside the existing `payload` object for backward compatibility.
- Validate `footer_rich_text` on project create/update/import paths and keep its plain fallback synchronized.
- Regenerate OpenAPI and the typed frontend contract when the request schema changes.

## UI implementation

- Add one reusable constrained editor for project footer and ready variants.
- Support selection-based link creation, editing and removal, plus bold/italic and native undo/redo.
- Render saved links visibly and accessibly in preview mode.
- Upgrade all relevant copy actions to rich clipboard output without removing the plain fallback.
- Keep controls touch-safe and without horizontal overflow at 390 px; keep the editing surface readable at 1440 px.

## Tests and acceptance

- Unit tests for normalization, unsafe URL rejection, plain-text derivation, escaped HTML rendering, footer application, and legacy fallback.
- API tests proving that manual rich edits create a new revision, preserve the old revision, keep the footer once, and enforce workspace authorization.
- Frontend tests or browser acceptance for selecting words, adding/removing links, saving, reopening, and rich/plain clipboard output.
- Real API-backed acceptance at 390 px and 1440 px; no fixtures and no duplicate `ContentItem`.
- Run `make lint`, `make typecheck`, focused tests, full tests, `make test-e2e`, OpenAPI generation/check, and production web build.

## Risks and rollback

- Clipboard HTML support differs by browser. Keep a visible success/error state and `writeText` fallback.
- Rich documents can drift from plain text if accepted independently. The API always normalizes the document and derives the canonical plain text.
- Platform markup capabilities differ. Rendering is connector-specific and must never leak unsupported tags or unsafe URLs.
- Rollback can ignore the additive JSON fields and restore plain editors. Existing `footer_template`, variant text, revisions, publications, media, and database schema remain valid.

## Verification result

- Focused rich-text, boilerplate, variant-revision, unsafe-link, Telegram-renderer, and MAX-renderer tests pass.
- `make lint`, `make typecheck`, `make test`, and OpenAPI export pass. The full API suite reports 90 passing tests.
- A real local API-backed flow created one project and one `ContentItem`, stored a reusable linked footer, generated Telegram/MAX variants, and reopened the footer with the saved link intact.
- The ready Telegram variant rendered the footer as a real anchor. Clipboard inspection proved one item with both `text/html` (including the anchor) and `text/plain` fallback.
- The ready-variant editor exposes link/unlink, bold, italic, undo, and redo. At 390 px and 1440 px the editor stayed visible, all six controls were present, and document `scrollWidth` equalled `clientWidth`.
- Parallel local Telegram/MAX generation also exposed and fixed a pre-existing SQLite catalog race by applying the same idempotent upsert behavior already used on PostgreSQL.
- No database table migration is required; existing plain-text variants and footers remain backward compatible.
