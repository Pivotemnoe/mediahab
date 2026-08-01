# Design QA - UI Phase 12A

## Evidence

- Source visual truth: `output/pdf/MediaHub_Simple_Voice_First_MVP_RU.pdf`, page 3.
- Source render: `tmp/pdfs/mediahub-voice-first-review/page-3.png`.
- Normalized source crop: `tmp/design-qa/source-phone.png`.
- Final implementation capture: `tmp/design-qa/implementation-390-final.jpg`.
- Side-by-side comparison: `tmp/design-qa/source-vs-implementation-390.png`.
- Responsive captures:
  - `tmp/design-qa/implementation-768.jpg`
  - `tmp/design-qa/implementation-1440.jpg`
  - `tmp/design-qa/implementation-1920.jpg`
- Route: `http://127.0.0.1:3001/app`.
- State: new material, configured demo project and rubric, Telegram and MAX selected, no recording in progress.

## Normalization

- Source slide render: 1404 x 993 px.
- Source phone crop: 460 x 770 px, normalized to a 390 x 844 comparison canvas.
- Implementation: 390 x 844 CSS px, captured as 390 x 844 px by the in-app browser.
- Device pixel ratio reported by the browser: 2; the browser capture API normalized the output to CSS-pixel dimensions.
- The source includes a presentation-owned phone bezel. The implementation is an unframed responsive PWA, so bezel and slide canvas are excluded from fidelity findings.

## Full-view comparison

The final mobile implementation preserves the source hierarchy: project, rubric, platform multi-select, primary microphone, ordered capture controls, transcript, and one assembly action. The large desktop explanation panel is intentionally hidden below 640 px so the microphone remains visible without scrolling.

The implementation has slightly more operational copy and controls than the simplified PDF mock because Pause, Continue, Finish segment, transcript review, and upload are required by the execution plan. This is an intentional product constraint rather than design drift.

## Focused comparison

The focused mobile comparison is `tmp/design-qa/source-vs-implementation-390.png`. It shows the selector density, platform control grouping, microphone prominence, orange accent, white surfaces, and Russian copy at readable scale. No additional image-focused comparison is needed because the target contains no photographic, illustrative, or branded raster assets.

## Required fidelity surfaces

- Fonts and typography: the implementation uses the existing product sans-serif stack, with source-equivalent bold headings and compact secondary labels. No clipped text or unreadable weight was observed at 390, 768, 1440, or 1920 px.
- Spacing and layout rhythm: the mobile-first ordering matches the source. Cards retain consistent 16 px outer spacing and the microphone is visible in the first 844 px viewport after the second pass.
- Colors and tokens: the existing Media Hub orange accent, warm background, white surfaces, green success state, and neutral borders match the PDF direction and preserve accessible contrast.
- Image and asset fidelity: the source has no app-owned raster imagery. Existing icon-library microphone, check, pause, play, upload, and edit icons are used consistently; no custom SVG, CSS illustration, emoji substitute, or placeholder asset was introduced.
- Copy and content: visible product copy is Russian, avoids UUIDs, queues, outbox, schemas, raw prompts, and phase names, and keeps manual human review explicit.
- Responsiveness: document `scrollWidth` equaled viewport width at 390, 768, 1440, and 1920 px. No horizontal overflow was observed.
- Interaction and accessibility: project/rubric selects, platform multi-select, `Выбрать все`, microphone error feedback in demo mode, transcript editing, and disabled assembly state were exercised. Visible interactive elements have natural DOM order and `tabIndex=0`; the browser's synthetic Tab command did not move focus, so keyboard traversal is additionally covered by DOM-order inspection rather than a complete keypress replay.
- Console: no browser console errors were present.

## Comparison history

### Pass 1

- Finding: [P1] the desktop explanation panel remained visible at 390 px and pushed the microphone below the first viewport.
- Evidence: `tmp/design-qa/implementation-390-viewport.jpg`.
- Fix: hide the explanatory hero below the `sm` breakpoint, reduce selector height, compact mobile platform cards, and hide secondary platform notes on mobile.

### Pass 2

- Finding: [P2] the microphone remained visually disabled in demo mode, which weakened the primary action compared with the source.
- Evidence: `tmp/design-qa/implementation-390-pass2.jpg`.
- Fix: keep the microphone visually active; in demo mode a click now returns an honest API-unavailable message without requesting microphone permission or creating fake content.

### Pass 3

- Post-fix evidence: `tmp/design-qa/implementation-390-final.jpg` and `tmp/design-qa/source-vs-implementation-390.png`.
- Result: project, rubric, platforms, and active microphone are visible without scrolling; no actionable P0, P1, or P2 visual issue remains.

## Residual test gaps

- The local preview ran in demo mode because no live API session was started. Real recording, S3 upload, provider transcription, and AI generation were not executed in the browser.
- Backend transcription/publication contracts, publication isolation, AI examples, manual VK/Reels profiles, and the full Python test suite passed. A real signed-in API browser smoke remains appropriate before release.
- The free-form per-platform instruction field is intentionally not represented as provider-backed success. Phase 12A supports editing, copy, deterministic quick edits, and regeneration; arbitrary AI refinement needs a separate API contract.

## Follow-up polish

- [P3] Consider a more compact mobile top bar if the account and quick-create controls compete with longer workspace branding.
- [P3] Capture the ready-results state against PDF page 4 when a live API session is available.

final result: passed
