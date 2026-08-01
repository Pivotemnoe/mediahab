# UI Phase 11O — Premium App Flow Routes

## Goal

Apply the Premium UI reference pack to the real authenticated app flow beyond the public home and `/app/content/new`.
The user should see a coherent mobile-first application:

`Главная приложения -> быстрое создание -> сбор материала -> ИИ-сборка и версии -> проверка площадок -> ручное подтверждение публикации`.

## Trigger

The owner reviewed the local app after UI Phase 11N and correctly pointed out that most pages still look like the old technical interface.
The Premium reference pack defines specific pages and patterns, not only a landing page or a single create screen.

## Current Audit

- `/app` is still a technical dashboard with stats, limits, integration rows, and schedule blocks as the first experience.
- The topbar `Создать` action is only a direct link, while the reference requires a command palette / quick action modal.
- `/app/publications` starts with technical publication-core details: operation states, queue, outbox, attempts, retries, and connector diagnostics.
- `/app/projects/[projectId]/builder` is an advanced builder but currently looks like a sparse technical settings list rather than the premium project-builder reference.
- `/app/content/new` was already redesigned in UI Phase 11N and stays in this slice except for integration with the new app flow.

## Scope

- Redesign the real `/app` and `/app/dashboard` home as an app-like mobile-first start screen:
  - primary `Что создаём?` surface;
  - large `Надиктовать материал` action;
  - secondary text/media creation actions;
  - recent drafts, publication review, and platform readiness as supporting blocks.
- Replace the topbar `Создать` link with a Russian command palette matching the reference:
  - `Надиктовать новый материал`;
  - `Вставить готовый текст`;
  - `Создать рубрику`;
  - `Проверить публикации`.
- Redesign `/app/publications` as a user-facing review and manual confirmation surface:
  - platform cards for Telegram, MAX, Instagram, manual export, and webhook where available;
  - explicit manual confirmation before sending;
  - technical queue, attempts, outbox, and retry details moved into `Расширенный режим`.
- Upgrade `/app/projects/[projectId]/builder` as an advanced project-builder page with a premium layout while keeping it out of normal content creation.
- Keep all visible UI in Russian.
- Preserve current backend APIs, server actions, OpenAPI contracts, and typed frontend DTOs.
- Keep human approval required before publication.
- Add visual smoke coverage for the redesigned routes at 390px, 768px, 1440px, and 1920px.

## Out Of Scope

- New product routes or extra demo/showcase pages.
- Backend schema changes, migrations, connector behavior, publication side effects, or auth changes.
- Full redesign of every settings/admin route.
- Reworking live STT/media upload mechanics inside `/app/content/[contentId]`; that remains the next dedicated slice for the voice bottom sheet.
- Hardcoding the “Что поесть? Армавир” preset into application logic.

## Assumptions

- Existing dashboard/publication/project service boundaries can provide enough data for app-like view models without API changes.
- Fixture names may still show the first preset when the app runs in fixture mode, but product logic must stay generic.
- Technical publication diagnostics remain valuable, but they should not dominate the normal publication screen.
- The command palette can be a client component in the existing topbar without changing navigation routes.

## Migrations

No database migration is planned.

## Tests

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make test`
- `make validate-spec`
- `git diff --check`
- New visual smoke script:
  - `/app`, `/app/dashboard`, `/app/content/new`, `/app/publications`, `/app/projects/chto-poest-armavir/builder`;
  - widths 390px, 768px, 1440px, 1920px;
  - no horizontal overflow;
  - no first-screen technical labels from old publication page;
  - app home, command palette trigger, publication review, and advanced builder are visible.

## Risks

- The app may still show fixture data when API mode is unavailable. The copy must make this safe without exposing technical debug language to normal users.
- Moving publication internals into advanced details can make diagnostics one click deeper for power users; this is intentional for the normal flow.
- Running `next build` while a dev server is active can break local dev CSS manifests. Stop the dev server before build checks and restart it afterwards if local preview is needed.

## Rollback

Revert this plan, the app-home/topbar/publications/project-builder frontend changes, the visual smoke script/report updates, and any spec-manifest validation updates.
No data rollback is needed because this slice changes no schema and no backend contract.
