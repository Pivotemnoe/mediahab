# Visual Test Plan

Status: UI Phase 00 planning baseline.

## Goal

Use Playwright screenshots to verify that the implemented UI remains responsive, non-overlapping, accessible enough for smoke checks, and visually aligned with the selected reference direction.

The reference HTML is not production code. PNG files are visual targets.

## Required Viewports

```text
390 x 844   mobile portrait
768 x 1024  tablet portrait
1280 x 800  laptop
1440 x 900  desktop
```

## Reference Targets

| UI Area | Reference |
|---|---|
| Desktop shell/dashboard/content studio | `design/ui-reference/01_editorial_studio.png` |
| Project/rubric builder | `design/ui-reference/03_visual_builder.png` |
| Mobile voice capture | `design/ui-reference/04_mobile_first_pwa.png` |
| Dark operations/publication queue later | `design/ui-reference/02_command_center.png` |

## Proposed Tooling

Add Playwright after approval:

```text
@playwright/test
```

Proposed scripts:

```json
{
  "test:ui-smoke": "playwright test tests/ui-smoke.spec.ts",
  "test:visual": "playwright test tests/visual.spec.ts"
}
```

Make targets after approval:

```text
make test-ui
make test-visual
```

Do not add this dependency in UI Phase 00 unless explicitly approved.

## Screenshot Artifacts

Recommended local artifact paths:

```text
artifacts/screenshots/ui-phase-01/
artifacts/screenshots/ui-phase-02/
```

Do not commit generated screenshots by default. Commit selected baseline PNGs only if the owner approves repo-stored visual baselines.

## UI Phase Coverage

UI Phase 01:

- component showcase;
- marketing shell;
- auth shell;
- cabinet shell;
- mobile navigation.

UI Phase 02:

- landing;
- pricing;
- login/register/reset;
- dashboard with fixtures.

UI Phase 03:

- project wizard states.

UI Phase 04:

- rubric builder desktop/tablet/mobile.

UI Phase 05:

- desktop content studio.

UI Phase 06:

- mobile voice PWA flow and offline draft state.

UI Phase 07:

- integrations and publications: partial success, retryable failure, manual_required.

## Smoke Assertions

Every visual smoke should check:

- page loads without client runtime errors;
- no horizontal scroll at target viewport;
- key headings and primary actions are visible;
- primary navigation is reachable;
- focus style is visible on at least one control;
- text does not overflow buttons/cards;
- modal/sheet/drawer fits viewport;
- loading, empty, error/offline states render where applicable.

## Screenshot Comparison Rules

Use reference PNGs for qualitative alignment, not exact pixel matching in early phases. Exact regression baselines become useful only after UI Phase 10 hardening.

Document meaningful deviations:

- layout changed for accessibility;
- route uses current backend data instead of static concept copy;
- dark Command Center intentionally deferred;
- product name differs due brand config.

## Runtime Verification

For phases that change actual UI, run:

```text
make typecheck
make lint
make test
make test-e2e
```

Then start the local app and capture screenshots at all target widths.

When a page needs the backend, run against the Docker Compose stack or fixture services. Avoid live social/API calls in visual tests.

## UI Phase 01 Visual Deliverables

UI Phase 01 should provide:

- screenshots of shell/showcase at 390, 768, 1280, 1440 widths;
- a short comparison note against Editorial Studio;
- documented deviations;
- no Command Center dark screenshots unless explicitly scoped.
