# UI Phase 11P — App Shell Reset and Real Composer

## Goal

Replace the old authenticated frontend shell and normal content flow with the Premium UI reference pack structure.
The app should no longer look like an admin dashboard with a permanent sidebar. The primary experience should be:

`Главная -> Создать -> проект/рубрика -> диктовка/текст -> ИИ-сборка -> превью -> публикация`.

## Trigger

The owner reviewed `/app/content/new` and pointed out that the old UI still dominates:

- persistent dark sidebar;
- old lower `Мастер материала` block stack;
- overloaded content-studio language;
- no real app-like composer/bottom-sheet feeling from the zip reference.

## Reference Pack Mapping

- `02_premium_mobile_home.png`: new mobile-first app home and simplified create entry.
- `03_premium_mobile_voice_sheet.png`: voice bottom sheet / recording surface.
- `04_premium_desktop_composer_dropdown.png`: desktop composer with project/rubric selector, block stepper, capture area, live preview.
- `05_premium_publish_modal.png`: publication review modal/card, not technical logs.
- `06_premium_project_builder.png`: project builder stays advanced.
- `07_premium_command_palette.png`: quick action modal from `Создать`.

## Scope

- Replace `CabinetShell` with a top app bar and compact bottom navigation instead of the old permanent sidebar.
- Keep no visible side menu in the normal app shell.
- Redesign `/app/content/new` as a single create screen matching mobile home / desktop composer references:
  - no lower duplicate old material wizard section;
  - project/rubric selector;
  - primary voice/text/media actions;
  - desktop live preview;
  - manual publication confirmation note.
- Redesign `/app/content/[contentId]` normal view as a real composer:
  - left block stepper on desktop;
  - central dictation/text/media surface;
  - right live preview on desktop;
  - mobile bottom-sheet style recording surface;
  - old technical studio moved into advanced details.
- Keep `/app/publications` user-facing and keep technical delivery in advanced mode.
- Preserve backend API/server action contracts.
- Keep UI Russian.

## Out Of Scope

- Backend schema/API changes.
- Production deploy.
- Rebuilding every admin/settings/billing page in this same slice.
- Removing existing advanced diagnostics code entirely; it can stay inside details/admin areas.

## Assumptions

- Existing service view models contain enough data for the simplified normal UI.
- Fixture/preset labels may appear as data, but no project-specific application logic should be added.
- The current `PilotVoiceTelegramPanel` remains the real mutation surface; this slice wraps it in an app-like composer instead of exposing the old studio as the first screen.

## Migrations

No migrations.

## Tests

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make test`
- `make validate-spec`
- `git diff --check`
- Visual smoke at 390, 768, 1440, 1920 px:
  - no visible old sidebar;
  - `/app/content/new` has no lower old wizard block stack;
  - `/app/content/[contentId]` has composer and bottom-sheet/mobile capture;
  - `/app/publications` remains review-first;
  - no horizontal overflow.

## Risks

- This is broader than the previous slices, so the biggest risk is breaking route layout assumptions.
- Some advanced technical blocks may still exist in `details`; they must not be visible in the normal first screen.
- If the old topbar/sidebar CSS assumptions leak into pages, visual smoke should catch horizontal overflow or old labels.

## Rollback

Revert this plan, shell changes, content shell changes, visual smoke updates, and the report. No data rollback required.
