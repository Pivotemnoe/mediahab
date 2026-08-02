# Design QA — UI Phase 12E.1 Deep Forest and notebook dictation

## Current verification

- Verified locally on 2026-08-02 against the API-backed release candidate.
- Production was not changed.
- Approved design source: `/Users/konstantin/.codex/generated_images/019fac1d-ab43-7252-8044-3bd77adb2d16/exec-c5e862c4-2790-41d0-ba36-2b08289454f3.png` (1487 x 1058 px).
- Current same-input comparison: `tmp/design-audit-phase12e1/10-reference-vs-create-1440.png`.
- Browser: Codex in-app Browser.
- Required viewports: 390 x 844 and 1440 x 1000 CSS px.
- Data mode: real local API, PostgreSQL, Redis, MinIO, and worker. No fixture history was used for the authenticated checks.

## Flow checked

1. Public landing at 390 and 1440 px.
2. Registration at 390 px.
3. First authenticated dashboard at 390 and 1440 px.
4. Notebook at 390 and 1440 px.
5. Text quick note saved through the local API and visible once in the notebook and dashboard.
6. First project created through the existing onboarding form.
7. Existing simple voice composer opened with that project selected, no rubric selected, at 390 and 1440 px.
8. Browser console and horizontal-overflow checks on the inspected states.

## Notebook dictation acceptance

- The quick voice action is named `Надиктовать заметку`.
- Text remains a separate action named `Сохранить идею`.
- Recording, stopping, and processing labels are `Надиктовать заметку`, `Закончить запись`, and `Расшифровываю…`.
- The quick API creates the note only after successful STT and returns exactly one `NoteOut`.
- The typed quick draft and voice transcript are stored in the same note.
- Provider failure creates no empty note, no transcription row, and no usage event.
- Foreign-workspace media is rejected.
- Accepted raw audio keeps the existing seven-day retention marker and one usage event.
- The saved-note `Надиктовать` action remains available for adding voice to an existing note.

## Visual evidence

- `tmp/design-audit-phase12e1/01-public-home-390-viewport.png`
- `tmp/design-audit-phase12e1/02-register-390.png`
- `tmp/design-audit-phase12e1/03-app-390.png`
- `tmp/design-audit-phase12e1/04-notebook-390.png`
- `tmp/design-audit-phase12e1/05-public-home-1440.png`
- `tmp/design-audit-phase12e1/06-app-1440.png`
- `tmp/design-audit-phase12e1/07-notebook-1440.png`
- `tmp/design-audit-phase12e1/08-create-1440.png`
- `tmp/design-audit-phase12e1/09-create-390.png`
- `tmp/design-audit-phase12e1/10-reference-vs-create-1440.png`

## Fidelity review

The implementation keeps the approved Deep Forest language: deep pine surfaces, warm ivory editorial headings, brass primary actions, mint selection states, restrained borders, a slim desktop rail, and a spacious primary work area. The existing Lucide icon set is used consistently.

The composer preserves the reference hierarchy while representing the safe idle state rather than inventing an active recording. The selected project, optional rubric, independent platform selection, current-post length control, transcript, microphone, manual text entry, and media entry remain visible and functional. At 390 px the content stacks without horizontal overflow and the primary microphone appears before the transcript field.

## Findings

- P0: none.
- P1: none.
- P2: none in the verified registration, dashboard, notebook, project, and composer path.
- P3: the concept includes an active-recording waveform and ready platform previews; the verified implementation screenshot intentionally shows the safe pre-recording state.
- P3: the real microphone permission and external OpenAI response were not triggered from the automated in-app Browser session. The provider path is covered by the existing OpenAI proxy tests, and the new atomic behavior is covered with deterministic API tests. A short owner-spoken production smoke remains appropriate after an approved deployment.

## Accessibility and browser observations

- Required controls have visible accessible names in the inspected DOM.
- Mobile and desktop inspected states had `scrollWidth == clientWidth`.
- No console errors were observed.
- The manual audit does not claim full WCAG conformance; color contrast and full keyboard traversal should remain part of a later formal accessibility pass.

## Verification commands

- `make openapi`
- `make lint`
- `make typecheck`
- `.venv/bin/python -m unittest services.api.tests.test_quick_notebook`
- `make test`
- `make test-e2e`
- `pnpm --filter @temichev/web build`
- `make migrate` against the isolated local PostgreSQL database
- `make seed` against the isolated local PostgreSQL database
- `git diff --check`

## Result

Passed locally for an application-only pilot deployment, subject to the separate production preflight and owner confirmation required by repository policy.
