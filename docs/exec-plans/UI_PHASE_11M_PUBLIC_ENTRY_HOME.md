# UI Phase 11M — Public Entry Home

## Goal

Make the public `/` page a strong first entry into Temichev Media Hub:
the visitor should understand what the service is for, how the material workflow works, and where to start, without confusing it with a Telegram-only or preset-specific tool.

## Trigger

After UI Phase 11L improved the Content Studio workspace, the owner asked to make the first page powerful and clear too, so a new user understands why the service exists and how to enter the product.

## Current Audit

- `/` already exists and uses `MarketingShell`.
- The current first screen explains the product only briefly and visually leans on `/assets/donika-telegram.jpeg`, which makes the product feel tied to the first preset.
- The primary CTA goes to registration, but the page does not clearly show the main working route: material wizard, collection, AI assembly, platform versions, and manual publication confirmation.
- Supporting sections are useful but read like technical capability cards instead of a confident product entry.

## Scope

- Redesign `apps/web/src/app/page.tsx`.
- Apply a narrow `MarketingShell` public-header breakpoint fix if the visual smoke proves tablet overflow.
- Add a narrowly scoped visual smoke check if needed.
- Keep all text in Russian.
- Keep `/features`, `/pricing`, `/security`, `/contacts`, `/login`, and `/register` navigation unchanged.
- Add clear entry actions:
  - create a material;
  - create an account;
  - open product capabilities.
- Replace the preset photo hero with a neutral product-composer scene built from UI elements, not from a hardcoded project asset.
- Explain the full Media Hub workflow:
  - material wizard;
  - source collection with voice/text/media;
  - AI assembly and platform versions;
  - preview and manual publication confirmation.
- Keep the first page as an app entry, not a generic marketing-only landing page.
- Add or update a visual smoke check for `/` across 390px, 768px, 1440px, and 1920px:
  - no horizontal overflow;
  - primary headline and CTA visible;
  - product workflow visible;
  - no preset-specific hardcoded copy on `/`.
- Add a Russian phase report after implementation.

## Out Of Scope

- Authentication changes.
- Backend or API contract changes.
- OpenAPI regeneration or typed frontend client regeneration.
- Reworking `MarketingShell` navigation globally.
- Reworking `/features`, `/pricing`, `/security`, or auth screens.
- Adding a live demo video or generated image asset.

## Assumptions

- The public homepage may link directly to `/app/content/new` as a product entry, while `/register` remains the account creation path.
- The first configured preset can remain in fixtures and importable data, but the public first screen should not depend on its name, photo, or rubric.
- A CSS/HTML product scene is acceptable for this slice because it avoids shipping a preset screenshot as the brand hero and keeps all visible copy Russian and product-specific.

## Migrations

No database migration is planned.

## Tests

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make test`
- `make validate-spec`
- `git diff --check`
- New or updated public homepage smoke:
  - 390px;
  - 768px;
  - 1440px;
  - 1920px.

## Risks

- A stronger homepage can accidentally become a standalone marketing landing page. Keep the primary action tied to product entry.
- Too much visual density can create mobile overflow. Verify all target widths.
- Removing the old photo may reduce immediate real-world flavor; compensate with a product-composer scene and concrete workflow language.

## Rollback

Revert this plan, the homepage changes, any smoke-test update, and the Russian report.
No data rollback is required.
