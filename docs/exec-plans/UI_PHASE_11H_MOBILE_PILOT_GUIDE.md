# UI Phase 11H — Mobile Pilot Guide

## Goal

Make the real content draft usable from a phone for the current Telegram pilot:
voice/text, media upload, AI preparation, and test publication must be the first visible path.

## Trigger

The owner confirmed the current desktop studio is still too overloaded on phone and asked for mobile-specific guidance and hints.

## Scope

- Add a mobile-first content studio layout.
- Put the `Голосовой пилот` workflow first on mobile.
- Move facts, previews, checks, and technical panels into collapsible mobile sections.
- Keep the desktop three-column studio available on large screens.
- Extend learning hints with click/tap popovers for mobile and a persistent on/off toggle.

## Out of Scope

- Full guided tour engine across every route.
- Final visual design.
- MAX/Instagram mobile publishing.
- Replacing the existing cabinet navigation.

## Assumptions

- Mobile pilot should optimize the current tested Telegram path, not all product capabilities.
- The same backend actions can be reused; this is a frontend layout and guidance slice.
- Hidden desktop/mobile duplicate panels are acceptable for this technical pilot while we validate the workflow.

## Tests

- `make typecheck`
- `make lint`
- web build
- `make validate-spec`
- `git diff --check`
- Visual smoke at 390px and 1440px:
  - mobile sees `Шаг 1: диктовка`;
  - mobile sees the pilot panel before fact forms;
  - mobile has collapsible sections for facts and checks;
  - desktop still has the three-column studio.

## Risks

- Duplicate hidden desktop/mobile panels increase page weight until the final responsive layout is consolidated.
- Native `<details>` sections are intentionally simple; richer anchored tours can be added later.

## Rollback

- Revert this plan, the mobile layout changes, and learning hint popover additions.
