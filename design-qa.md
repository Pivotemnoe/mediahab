# Design QA — Phase 12H idea-to-post activation

## Comparison target

- Source visual truth, desktop: `/Users/konstantin/Documents/Медиа хаб/tmp/idea-ux-audit-2026-08-13/04-composer-desktop.png`.
- Source visual truth, mobile: `/Users/konstantin/Documents/Медиа хаб/tmp/idea-ux-audit-2026-08-13/05-composer-mobile.png`.
- Rendered implementation, desktop: `/Users/konstantin/Documents/Медиа хаб/tmp/phase12h-final-audit/11-composer-desktop-1280x720.png`.
- Rendered implementation, mobile: `/Users/konstantin/Documents/Медиа хаб/tmp/phase12h-final-audit/12-composer-mobile-390x844.png`.
- New interaction states: `03-idea-sheet-empty-desktop.png`, `04-idea-sheet-results-desktop.png`, `07-idea-sheet-empty-mobile.png`, `08-selected-idea-mobile-viewport.png`, and `16-friendly-error-mobile.png` in `/Users/konstantin/Documents/Медиа хаб/tmp/phase12h-final-audit/`.
- Full-view comparison evidence: `/Users/konstantin/Documents/Медиа хаб/tmp/phase12h-final-audit/13-source-vs-current-desktop.png` and `/Users/konstantin/Documents/Медиа хаб/tmp/phase12h-final-audit/14-source-vs-current-mobile.png`.

## Normalization and state

- Desktop source and implementation were compared at 1280 x 720 CSS px and 1280 x 720 image px, device scale factor 1. The combined comparison is 2560 x 720 px.
- Mobile source and implementation were compared at 390 x 844 CSS px and 390 x 844 image px, device scale factor 1. The combined comparison is 780 x 844 px.
- Theme and account state: authenticated Deep Forest interface, project `Пилотный блог`, no selected rubric, Telegram and MAX selected, empty transcript.
- Browser: Codex in-app Browser against the local Next.js application and local API.
- The source images cover the composer, not the newly added idea sheet. The composer comparison is therefore fidelity-based; the sheet is assessed as an extension of the same existing design system rather than claimed as a pixel match to a missing mock.

## Findings

- P0: none.
- P1: none remaining.
- P2: none remaining.
- P3: the selected-idea card adds vertical content below the microphone on mobile. This is intentional progressive disclosure; the primary recording action remains above it and no persistent control is clipped.

## Required fidelity surfaces

- Fonts and typography: the existing editorial heading and interface text hierarchy is preserved. Weights, line heights, wrapping, and small-label contrast remain legible at both target widths; no truncation was observed.
- Spacing and layout rhythm: composer alignment, rail/content proportions, card radii, gutters, and vertical rhythm match the source comparisons. The mobile sheet uses the viewport width, retains safe internal padding, and scrolls without horizontal overflow.
- Colors and tokens: the deep pine surfaces, warm ivory text, brass primary action, mint selected states, restrained borders, and red semantic error treatment consistently use the established Deep Forest language.
- Image quality and asset fidelity: the compared flow contains no photographic or illustrative assets. Existing Lucide icons remain consistent in stroke, size, and alignment; no placeholder art, emoji, CSS art, or replacement SVG was introduced.
- Copy and content: the main action is plain-language `Помоги придумать`; the sheet explains that ideas are drafts and real facts must be supplied by the author. Technical provider messages are not exposed. Publication is still explicitly human-confirmed.
- Responsiveness: no horizontal overflow or overlapping controls was observed at 1280 x 720, 1440 x 1000, or 390 x 844. The modal remains scrollable and usable at the mobile viewport.
- Accessibility: the sheet has dialog semantics, an accessible name, labelled inputs and button groups, Escape close, focus containment/restoration, visible focus states, and practical mobile tap targets. The generator CTA is disabled when a transcript already exists, preventing two unrelated sources from being mixed silently.

## Interaction and focused-region evidence

- Tested opening and closing the sheet, focus placement, goal selection, generation, error, accepting an idea, returning to the same composer, and continuing from the selected idea.
- Focused evidence was needed because the new sheet and selected-idea card are not readable in the full composer comparison. The desktop empty/results captures and mobile empty/selected/error captures listed above were inspected separately.
- The final error-state capture at `/Users/konstantin/Documents/Медиа хаб/tmp/phase12h-final-audit/16-friendly-error-mobile.png` is 390 x 844 px at density 1. It shows a Russian explanation and the decremented `17 из 20` counter after a failed generation.
- Browser logs contained only React/Next.js development information and Fast Refresh messages; no warning or error was observed in the accepted states.

## Comparison history

1. Initial composer comparison: no actionable P0/P1/P2 layout, typography, color, icon, or responsive drift.
2. First generated-error pass found two P2 trust/copy issues: raw English backend wording was shown to the user and the remaining-attempt counter stayed stale after a charged failed run.
3. Fix applied in the idea sheet: known backend errors are mapped to plain Russian product copy, unknown technical text is replaced by a safe generic message, and every accepted generation attempt updates the local quota count.
4. Post-fix browser pass at 390 x 844 confirmed `Получились темы, слишком похожие на недавние публикации…` and `17 из 20`; the final capture is `16-friendly-error-mobile.png`. No P0/P1/P2 finding remains.

## Implementation checklist

- [x] Preserve the approved composer hierarchy at desktop and mobile sizes.
- [x] Keep idea generation optional and out of the voice-first primary path.
- [x] Keep selected AI planning text separate from user facts.
- [x] Verify empty, results, selected, and error states in the browser.
- [x] Verify Russian copy, quota feedback, accessibility semantics, and browser logs.

## Follow-up polish

- After the owner pilot is enabled, capture one real-device microphone-to-selected-idea session on iOS/Android PWA. This is a device acceptance check, not a remaining desktop design defect.

## Final result

passed
