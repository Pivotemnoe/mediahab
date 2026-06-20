# UI Acceptance Checklist

## General

- [ ] Brand values come from central configuration.
- [ ] No project-specific rubric hard-coding in generic components.
- [ ] Screens use a service/repository layer or fixtures.
- [ ] Loading, empty, error, offline, permission, and limit states exist.
- [ ] No horizontal scroll at target viewports.
- [ ] Keyboard navigation and visible focus work.
- [ ] Forms have labels, descriptions, and errors.
- [ ] Destructive actions require confirmation.

## Content Studio

- [ ] Character budget per platform.
- [ ] Master and platform variants are clearly separated.
- [ ] AI-generated fields are marked.
- [ ] User facts can be locked.
- [ ] Autosave and unsaved-state feedback exist.
- [ ] Media can be reordered.
- [ ] Partial publication success is represented correctly.

## Mobile PWA

- [ ] One-hand primary flow.
- [ ] Recording states: idle, recording, paused, uploading, transcribing, error.
- [ ] Transcription review after every block.
- [ ] Previous step navigation.
- [ ] Draft recovery after restart.
- [ ] Clear offline behavior.

## Rubric Builder

- [ ] Add, remove, and reorder fields.
- [ ] Repeatable groups.
- [ ] Value source and required state.
- [ ] Editorial length limits.
- [ ] Platform technical limits cannot be overridden incorrectly.
- [ ] Live form preview.

## Visual verification

- [ ] Playwright screenshots at 390×844.
- [ ] Playwright screenshots at 768×1024.
- [ ] Playwright screenshots at 1280×800.
- [ ] Playwright screenshots at 1440×900.
- [ ] Compare implementation with selected references.
- [ ] Document meaningful deviations.
