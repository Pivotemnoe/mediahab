# Frontend and UX specification

## Design goals

- Mobile-first because primary use is field dictation and phone media selection.
- Fast path from opening the app to recording the next content block.
- Clear distinction between facts, AI suggestions, user edits, and published text.
- Every platform variant is previewable and independently editable.
- Complex constructor features are progressive: simple controls first, advanced JSON/prompt controls only for experts.

## Marketing site

Sections:

1. Hero: one content workflow, several platforms.
2. Problem and outcome.
3. Voice-to-post workflow.
4. Project and rubric constructor.
5. AI editor and examples library.
6. Telegram, MAX, Instagram previews.
7. Use cases: local media, expert, clinic, food blog, personal brand.
8. Pricing placeholder.
9. Security and data ownership.
10. Registration CTA.

## Cabinet navigation

Desktop sidebar and mobile bottom navigation. Primary actions:

- Dashboard.
- Create.
- Projects.
- Content.
- Publications.
- Media.
- Settings.

## Project Builder UX

Use a stepper with autosave. AI rubric proposals appear as cards with `Accept`, `Edit`, and `Discard`. The user can reorder rubrics and archive them. Do not expose raw JSON by default.

## Rubric Builder UX

Three panels on desktop, stacked on mobile:

1. Field palette.
2. Form canvas with drag-and-drop.
3. Field/settings inspector.

Actions:

- Add field.
- Add repeatable group.
- Mark user or AI source.
- Set required/optional.
- Set editorial length.
- Configure generated fields.
- Preview mobile form.
- Save new version.

## Content Studio UX

### Header

- Project.
- Rubric.
- Draft status.
- Autosave state.
- Character range.
- “Assemble” action.

### Guided mode

Shows one block at a time with:

- Prompt such as “Describe the atmosphere.”
- Record button.
- Text input.
- Previous/next.
- “Add another dish.”
- Completion progress.

### Full editor mode

Shows all blocks, source provenance, lock state, transcript, and media.

### AI review mode

Diff-style view:

- User source or previous revision.
- AI draft.
- Highlighted changed facts or unsupported additions.
- Hook alternatives.
- Editable ratings.
- Approve or regenerate selected section.

No “regenerate everything” as the only option; allow section-level revision.

## Media UX

- Multi-select upload.
- Drag-and-drop ordering.
- Photo/video badges and duration.
- Per-platform compatibility warnings.
- Cover selection.
- Remove from content without immediately deleting the asset.
- Upload progress and resumable state where storage provider supports it.

## Platform preview

Tabs for Telegram, MAX, Instagram, and future destinations. Each tab shows:

- Destination.
- Rendered content.
- Editorial and technical counters.
- Media layout.
- Warnings/errors.
- Edit variant.
- Approve.
- Schedule/publish.

Telegram preview must include Rich Message collage mode and explicitly show when fallback mode would split media and text.

## Publication UX

Publication confirmation dialog lists all destinations and independent statuses. Partial success remains visible. Failed destinations have `Retry`, `Edit variant`, and `Open details` actions.

## Billing UX

- Current plan.
- Usage bars.
- Available plans.
- “Pay subscription” button.
- In MVP, show a clear coming-soon/manual-contact state rather than a fake successful checkout.

## PWA requirements

- Install prompt surfaced appropriately, not aggressively.
- App shell works after reload.
- Draft text cached locally.
- Service worker version update banner.
- Clear offline badge.
- AI/publication buttons disabled with explanation while offline.

## Accessibility

- WCAG-oriented semantic components.
- Labels for recorder controls.
- Keyboard operability.
- Focus management in dialogs and drag/drop alternatives.
- Errors announced and linked to fields.
