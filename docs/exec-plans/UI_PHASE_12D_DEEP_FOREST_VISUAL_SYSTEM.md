# UI Phase 12D — Deep Forest Visual System and Entry Flow

## Status

Implemented locally on 2026-08-01 and deployed to production on 2026-08-02 in release `20260802-062724-phase12e1-deep-forest` after the product owner selected the third visual direction: a dark pine base, mineral-green states, warm ivory copy, and restrained brass actions.

## Goal

Bring the selected visual system into the existing MediaHub product without changing its working content, AI, voice, or publication contracts. The public home, authentication entry, application shell, dashboard, and simple voice composer should feel like one modern mobile-first PWA while keeping the primary path obvious:

`dictate or paste source -> select project and optional rubric -> select platforms -> generate separate versions -> review manually`.

## Scope

- Replace the current light/orange tokens with the selected Deep Forest system.
- Recompose `/` around the selected editorial split layout:
  - concise Russian positioning;
  - voice-first primary action;
  - a visible source-to-platform demonstration;
  - Telegram, MAX, VK, and Instagram as separate results;
  - explicit human confirmation and no automatic publication claim.
- Restyle `/login` and the shared auth shell so it belongs to the same product.
- Restyle the authenticated topbar, dashboard hero, cards, and the simple voice composer through shared tokens and focused component changes.
- Preserve existing routes, service boundaries, API calls, form behavior, dictation flow, saved drafts, length controls, Instagram formats, feedback, and publication safeguards.
- Keep the UI generic. The `Что поесть? Армавир` preset may appear only through database or fixture data, never as landing-page or application logic.
- Keep all visible product copy in Russian.

## Out of scope

- Backend behavior, database schema, Alembic migrations, OpenAPI changes, AI prompts, provider settings, connector changes, authentication behavior, billing, deployment, or production data.
- New product routes or a second parallel application shell.
- Automatic publication or removal of the existing human-confirmation gate.
- A full redesign of every advanced settings and diagnostics page in this slice.

## Visual tokens

- Page: `#081814`
- Primary surface: `#10261f`
- Raised surface: `#173128`
- Primary text: `#f1f4ea`
- Secondary text: `#aab8ab`
- Border: `#29463a`
- Primary action / voice: `#c5a35a`
- Selected and success states: `#52b69a`
- Focus: `#79cdb3`
- Shape: restrained 8–14 px radii, thin borders, no glassmorphism, no gradients, no neon.
- Editorial display headings use a readable system serif stack; product controls keep the existing system sans stack.

## Assumptions

- Existing Lucide icons are part of the current interface system and remain the shared icon source.
- Current fixture/API view models are sufficient; this phase needs no backend contract changes.
- A generic editorial image may be added as a public marketing asset. It must not contain a real client name, location, platform screenshot, or preset-specific text.
- The existing desktop Chrome visual-smoke route is the local browser verification path. No production or external browser state is required.

## Migrations

No database migration is planned.

## Tests and verification

- `make typecheck`
- `make lint`
- `pnpm --filter @temichev/web build`
- existing public-home visual smoke at 390, 768, 1440, and 1920 px, updated for the new copy and four-platform preview;
- authenticated app-flow visual smoke where fixture mode permits it;
- direct browser inspection of `/`, `/login`, `/app`, and `/app/content/new` at desktop and mobile widths;
- same-viewport comparison of the selected reference and the implemented public home;
- `git diff --check`.

## Risks

- A dark global token change may reduce contrast on components that previously assumed white surfaces. Mitigation: inspect shared buttons, badges, form controls, notices, dialogs, dashboard cards, and the voice composer at both mobile and desktop widths.
- Existing visual-smoke assertions include old copy. Mitigation: update assertions only where the intended UI changed; retain behavioral, overflow, and safety checks.
- The selected desktop reference is dense. Mitigation: preserve its hierarchy on desktop but stack the source and platform results on mobile instead of shrinking them below readable sizes.
- Build and dev-server processes can interfere with the Next.js output directory. Mitigation: run checks sequentially and restart the local preview after the build if needed.

## Rollback

Revert this plan, the shared visual tokens, the public-home composition, auth/app shell styling, focused dashboard/composer styles, the generic marketing asset, and updated visual-smoke expectations. No data rollback is needed because this phase changes no schema, API, or production state.

## Completion notes

- Applied the Deep Forest tokens to the shared theme, public home, authentication shell, application shell, dashboard, mobile navigation, and simple voice composer.
- Added one neutral generated editorial asset for the public project example. No client, city, preset, or platform branding is embedded in the asset.
- Updated the public-home and authenticated app-flow visual smoke checks to the intended Phase 12D copy while retaining overflow, route, platform, manual-confirmation, and old-copy guards.
- Verified the public home at 390, 768, 1440, and 1920 px and six authenticated routes at the same four widths. All checked pages had no horizontal overflow.
- Verified the landing CTA, quick-create palette, platform selection, and Instagram format picker. Microphone permission was not accepted during automated inspection because it requires an explicit user decision.
- `make lint`, `make typecheck`, `make test` (97 API tests plus UI hardening checks), and `pnpm --filter @temichev/web build` passed. The initial concurrent typecheck/build attempt exposed a transient `.next/types` race; the sequential typecheck after the build passed.
- No migration, external publication, or production-data change was required.
- The owner separately approved an application-only production deployment. Public home and health returned HTTP 200; PostgreSQL and Redis container IDs and all recorded row counts remained unchanged.
