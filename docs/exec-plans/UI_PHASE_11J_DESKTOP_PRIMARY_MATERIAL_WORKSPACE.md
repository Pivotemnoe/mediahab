# UI Phase 11J — Desktop Primary Material Workspace

## Goal

Make the desktop Content Studio visibly template-first, not a technical editor with a small wizard in the side column.
The primary desktop workspace should show the material wizard, capture panel, and platform outputs first.
The previous guided form, fact locks, checks, previews, draft, suggestions, and history remain available in an advanced mode.

## Trigger

After UI Phase 11I, the owner reviewed desktop screenshots and pointed out that the web version still looks mostly unchanged.

## Scope

- Promote `Мастер материала` to the main desktop area.
- Put `Сбор материала` beside it as the primary work panel.
- Keep `Площадка: Telegram` inside the capture/publishing panel.
- Move the old technical three-column studio into `Расширенный режим`.
- Keep mobile behavior from Phase 11I.
- Update visual smoke so desktop asserts the primary workspace and the advanced details shell.

## Out of Scope

- Backend changes.
- New platform connectors.
- Rewriting guided form actions.
- Live Telegram publication.
- Final visual redesign of every technical card.

## Tests

- `make typecheck`
- `make lint`
- web build
- `make test`
- `make validate-spec`
- `git diff --check`
- Visual smoke at 390px, 1440px, and 1920px:
  - mobile remains one primary path;
  - desktop starts with primary material workspace;
  - desktop technical studio exists under `Расширенный режим`;
  - Telegram publish button remains in the Telegram platform block.

## Risks

- Desktop now renders the technical studio inside details, so users must expand it for dense field work.
- Some technical cards are still visually old inside advanced mode; this slice changes hierarchy, not the full visual system.

## Rollback

- Revert the desktop layout changes, smoke updates, this plan, and the Russian report.
