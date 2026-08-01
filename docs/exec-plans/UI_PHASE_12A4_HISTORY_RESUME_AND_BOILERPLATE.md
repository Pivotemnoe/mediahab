# UI Phase 12A.4 - Resume from History and Persistent Link Blocks

## Status

Implemented, deployed, and verified in production on 2026-07-31.

## Objective

Let a user reopen a saved material from History, correct its original text, and assemble new platform revisions without dictating again. Let each project store a fixed footer, including ordinary URLs, that is preserved exactly in generated, refined, edited, copied, and published text.

### Local follow-up: direct refinement from a saved platform version

Add one compact `Refine` action to every ready platform card on the saved-material page. The action reuses the existing simple voice editor, opens the selected saved variant immediately, and exposes the existing edit, shorten, liveliness, humor, emoji, rebuild, and free-form controls without first regenerating every platform. It must keep the same `ContentItem`, previous revisions, media, project, rubric, platform selection, and fixed footer. This follow-up is local until the owner separately approves production deployment.

## Product decisions

1. The material detail page exposes `Edit source and rebuild` next to the saved source text.
2. The action resumes the same `ContentItem`; it does not create a duplicate and does not discard existing revisions.
3. Project and rubric are restored and locked while resuming. Existing publication media remains attached.
4. Existing platform choices are restored when possible; otherwise Telegram and MAX remain the default.
5. A changed source creates a content revision and unlocks a previously locked source fact before a new master is assembled.
6. Project settings gain one optional fixed footer field. Plain `https://` links are stored as text and survive clipboard copying. There is no persistent header.
7. Fixed blocks are applied by application code after AI generation and count toward platform hard limits. AI is not asked to reproduce or rewrite them.
8. Refinement operates on the post body and the exact current project footer is reapplied afterward.
9. Existing projects need no data migration; the fields live in the versioned `cta_config` JSON.
10. Every ready platform version on the saved-material page has its own `Copy` action. The copied text includes the exact fixed footer.
11. Every ready platform version also has a `Refine` action. It passes the platform key into resume mode and hydrates the latest saved variant instead of creating a duplicate or forcing a full rebuild.

## Implementation

- Add a resume view model for an existing content item, its source block, media count, and latest platform keys.
- Add `edit=<content_id>` handling to `/app/content/new`.
- Hydrate the simple composer with the existing item, transcript, source field/block, rubric, platforms, and photo count.
- Add the history-detail edit CTA and a clear resume-state notice.
- Add a clipboard action to every ready platform version on the saved-material page.
- Add a `footer_template` input to project rules while preserving all unrelated CTA configuration.
- Add shared boilerplate helpers used by platform generation and AI refinement.
- Keep manual variant editing possible while preventing accidental duplicate fixed blocks.
- Hydrate the latest saved variants in resume mode and focus the platform selected on the material-detail page.
- Add a mobile-safe `Refine` action next to `Copy`; reuse the existing refinement API and controls rather than adding a new editor.

## Tests

- View-model test for resuming the same content item.
- Browser/component acceptance for the history CTA and prefilled composer.
- Unit tests for exact footer application, duplicate prevention, and stripping before refinement.
- Publication tests proving fixed links count toward MAX/Instagram limits.
- `make lint`, `make typecheck`, focused tests, full tests, production web build, and relevant browser smoke.
- Follow-up acceptance at 390 px and 1440 px: every ready card exposes `Refine`, the selected saved variant opens directly with refinement controls, the page has no horizontal overflow, and no new `ContentItem` is created before or after refinement.

## Verification result

- The local direct-refinement follow-up passes at 390 px and 1440 px against an isolated API-backed material: every ready card has `Copy` and `Refine`, the selected MAX/Telegram saved variant opens directly in the existing editor, all six quick refinement controls are present, the fixed footer appears exactly once, and neither viewport has horizontal overflow. Loading and opening the editor does not create a new content item. Production was not changed.

- Focused footer and publication-revision tests pass, including ordinary Telegram/MAX URLs, duplicate prevention, manual edits, legacy-header exclusion, and platform-limit validation.
- `make lint`, `make typecheck`, `make test`, and `make test-e2e` pass.
- The Next.js production build completes successfully.
- An authenticated local API-backed browser flow was verified at 390 px and 1440 px: History contained one real material and no fixtures, the saved-material page exposed the resume CTA and one copy action per ready version, and neither viewport had horizontal overflow.
- The resume action opened `/app/content/new?edit=<content_id>` in the existing simple voice editor. Project and rubric stayed locked, Telegram and MAX were restored, and the attached photo count stayed at one.
- A real local rebuild kept exactly one `ContentItem`, retained the attached photo, preserved the two old platform variants, created two new variants, and kept the fixed footer exactly once in every new text and clipboard result.
- No OpenAPI contract or database schema changed; no migration or generated-client update is required.

## Production deployment

- Release `20260731-0748-phase12a4-history-resume` is running on `https://temichev-posthub.ru`.
- Only `api`, `worker`, and `web` were recreated. PostgreSQL, Redis, Docker volumes, Caddy, and neighboring services were left running unchanged.
- Alembic remains at `202606200008 (head)`. The verified backup and rollback artifacts are stored under `/var/backups/media-hub/20260731-0748-phase12a4-history-resume` and the previous app images are tagged `rollback-20260731-0748-phase12a4-history-resume`.
- The production web image now starts the already-installed Next.js binary directly, avoiding a runtime Corepack network download through the OpenAI proxy.
- Authenticated production acceptance used the real saved item `0a0e2f34-36ac-424b-8e5f-507798c12cb5`: History contained one item before and after opening resume mode, no fixture/demo fallback appeared, and project, rubric, transcript, Telegram, and MAX were restored.
- The saved-material page exposed one resume action and one working copy action per ready variant. Its configured footer appeared exactly once in each existing Telegram/MAX variant.
- The current production sample has no attached photos, so real-data media retention could not be observed there; the API-backed local acceptance and automated tests cover the one-photo resume case.
- The current project footer contains link labels but no explicit `https://` targets. The release preserves the configured footer exactly; actual clickable/copyable destinations require the owner to enter the Telegram/MAX/site URLs in project rules.
- Browser verification passed at 390 px and 1440 px with no horizontal overflow.

## Risks and rollback

- A long fixed footer can push a platform variant over its hard limit; the existing validator must report this instead of truncating links.
- Old project versions remain immutable. The current active project footer is treated as live channel branding and is applied when an old material is rebuilt, while its saved source and previous variants remain unchanged.
- Rollback removes the resume CTA and deterministic boilerplate application. Stored JSON keys can remain harmlessly in historical project versions; no database rollback is required.
