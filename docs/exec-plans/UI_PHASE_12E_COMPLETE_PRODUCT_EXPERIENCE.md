# UI Phase 12E — Complete Public-to-Product Experience

## Status

Implemented locally on 2026-08-02. No production deployment, backend mutation, database migration, or publication action was performed.

## Goal

Carry the approved Deep Forest visual language through the whole first-use journey:

`understand the product -> register or sign in -> dictate or paste an idea -> select destinations and length -> review separate versions -> return to drafts or voice notes`.

The interface must stay understandable to a blogger who does not know the product architecture. Voice capture is the primary action. The notebook remains a first-class voice and text capture surface.

## Scope

- Expand the public home into a complete landing page with:
  - a clear voice-first promise and primary CTA;
  - a realistic product demonstration;
  - a three-step workflow;
  - supported-platform guidance for Telegram, MAX, VK, and Instagram;
  - creator use cases;
  - product-control and human-approval reassurance;
  - concise FAQ, final CTA, and public footer.
- Apply the same editorial Deep Forest hierarchy to public feature, pricing, security, contact, and legal shells.
- Keep login and registration consistent with the public promise and remove developer-facing wording from visible copy.
- Replace the desktop top navigation with a slim persistent sidebar based on the approved reference:
  - `Создать`;
  - `Черновики`;
  - `Блокнот`;
  - `Мой стиль`;
  - a progressive `Ещё` menu for projects, publications, calendar, media, integrations, workspace, account, billing, and settings.
- Add a friendly top-level `Мой стиль` route that leads users to existing project rules, rubrics, and examples without exposing prompt or schema terminology.
- Preserve a compact mobile bottom navigation and make all shared application routes inherit the new shell.
- Restyle the dashboard, notebook, and settings entry copy around creator tasks rather than implementation phases.
- Preserve existing voice, notebook, project, AI, variant, publication, auth, and API behavior.

## Out of scope

- Backend behavior, database schema, migrations, OpenAPI, providers, connectors, publication automation, payments, deployment, production data, or production configuration.
- Removing advanced routes or capabilities. They remain accessible through progressive navigation.
- Claiming that a platform publication or payment capability is live when the existing implementation still requires manual or external setup.
- Replacing human confirmation before publication.

## Design contract

- Source visual truth: `/Users/konstantin/.codex/generated_images/019fac1d-ab43-7252-8044-3bd77adb2d16/exec-c5e862c4-2790-41d0-ba36-2b08289454f3.png`.
- Deep Forest tokens from UI Phase 12D remain authoritative.
- The desktop application follows the reference proportions: slim navigation, spacious main work surface, contextual actions, restrained cards, clear hover/focus/open/success states.
- The landing page uses the same palette, typography, borders, and brass/mint accents. It should explain value before configuration.
- No glassmorphism, neon, decorative gradients, excessive nested cards, fake platform capabilities, or technical copy.
- Use the existing icon library for UI icons and the existing generated editorial asset where imagery is needed.

## Assumptions

- Existing routes and view models are sufficient for a complete frontend experience; this slice does not need backend changes.
- `/app/style` may be a new frontend route that composes links to existing project settings, rubrics, and examples.
- The quick-create palette remains useful as a secondary shortcut, while the persistent navigation owns primary wayfinding.
- The existing notebook is the canonical voice-note implementation and must not be duplicated.

## Migrations

No database migration is planned.

## Tests and verification

- `make lint`
- `make typecheck`
- `make test`
- `pnpm --filter @temichev/web build`
- updated public-home and authenticated-app visual smoke checks;
- browser inspection at 390, 768, 1440, and 1920 px for `/`, `/login`, `/register`, `/app`, `/app/content/new`, `/app/content`, `/app/notebook`, `/app/style`, and `/app/settings`;
- interaction checks for public navigation, sidebar active state, `Ещё`, quick-create, platform selection, length controls, notebook entry, and mobile navigation;
- console-error and horizontal-overflow checks;
- same-viewport visual comparison of the approved reference and the implemented create screen, recorded in `design-qa.md`;
- `git diff --check`.

## Risks

- A full sidebar can reduce the composer width. Mitigation: use a slim rail and hide it below the desktop breakpoint.
- Existing pages contain technical phase copy. Mitigation: fix shared shells and high-frequency entry pages first, while keeping truthful operational limitations on detailed pages.
- The repository already contains uncommitted UI Phase 12D work. Mitigation: build additively on those changes and do not revert unrelated work.
- Visual QA may require fixture mode because API mode is authentication-gated. Mitigation: use the existing fixture/browser smoke path and do not weaken auth.

## Rollback

Revert this plan and its Russian translation, the sidebar/navigation additions, the `/app/style` route, landing-page sections, shared public/auth/app-shell styling, and focused creator-copy updates. No data rollback is required.

## Completion notes

- The complete signed-out landing and authentication entry now explain the product before configuration.
- Every existing cabinet route inherits the shared Deep Forest shell. The desktop rail keeps `Создать`, `Черновики`, `Блокнот`, and `Мой стиль` visible; lower-frequency sections are grouped under `Ещё`.
- The notebook has a direct voice-note action in addition to its existing text flow.
- The create screen follows the approved voice-studio composition and keeps per-platform selection and length controls explicit.
- `make lint`, `make typecheck`, `make test`, the production web build, in-app Browser responsive/interaction inspection, the final visual comparison, and `git diff --check` passed. The visual evidence is recorded in `design-qa.md`.
- No migration was required. Existing API, publication, authentication, and human-approval behavior remains unchanged.
