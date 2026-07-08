# UI Phase 11L — Premium Content Studio Surface

## Goal

Make the primary Content Studio screen feel like one polished material composer:
the user should see the material path, active capture block, media/AI actions, live platform previews,
and manual publication confirmation without the normal flow feeling like a backend form.

## Trigger

The owner asked to continue the frontend redesign using the premium UI reference pack while preserving backend API contracts and all existing functions.
UI Phase 11I and 11J already moved the product framing from Telegram-first to material-first; this slice improves the first working surface rather than rewriting the whole product.

## Current Audit

Evidence captured locally before edits:

- `/private/tmp/mediahub-audit-before-390.png`
- `/private/tmp/mediahub-audit-before-768.png`
- `/private/tmp/mediahub-audit-before-1440.png`
- `/private/tmp/mediahub-audit-before-1920.png`

Findings:

- The page has no horizontal overflow at 390, 768, 1440, or 1920px.
- The desktop 1920px layout already has the right broad shape: material path, capture panel, and platform preview.
- At 390px and 768px, the first viewport is still dominated by technical summary/status cards before the main material path.
- The capture panel is functionally complete but visually reads as a long technical form, especially around file inputs, action-state messages, and repeated AI buttons.
- Publication is still a normal Telegram action block inside the capture form; it needs to read as a manual confirmation step and platform review, while still calling the same server action.
- The existing visual smoke missed 768px and produced one false negative on 390px in the current checkout; the new slice should make the smoke more useful and less brittle.

## Scope

- Add a compact primary material header that keeps status, autosave, and publication readiness visible without pushing the user path too far down on mobile.
- Restyle the material wizard into a denser stepper that fits mobile and desktop better.
- Restyle `Сбор материала` into a composer surface:
  - active block selector;
  - recording actions;
  - transcript review;
  - media upload;
  - AI assembly actions.
- Add a publication review surface for Telegram/MAX/Instagram previews and keep manual confirmation explicit.
- Keep the existing Telegram publication server action and button inside the Telegram output block.
- Keep guided form, fact locks, checks, master draft, AI suggestions, and revision history in advanced/details sections.
- Update visual smoke for 390, 768, 1440, and 1920px.
- Add a Russian phase report after implementation.

## Out Of Scope

- Backend schema changes.
- API contract changes, OpenAPI regeneration, or typed client regeneration.
- New social connector behavior.
- Live Telegram, MAX, or Instagram publication.
- Persisting `Обзор места` as a database template name.
- Full redesign of project builder, dashboard, billing, or admin diagnostics.

## Assumptions

- `Обзор места` remains a frontend UX label over the current rubric until the open product-owner question is resolved.
- Publication must remain human-confirmed. UI polish must not make publication feel automatic.
- The reference pack is a direction for hierarchy and interaction patterns, not a strict pixel source.
- The existing component set is intentionally small; this slice should prefer local component functions over adding dependencies.

## Migrations

No database migration is planned.

## Tests

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make test`
- `make validate-spec`
- `git diff --check`
- `tools/check_content_fixture_visual_smoke.mjs`:
  - 390px: no horizontal overflow; primary material path and capture panel are visible; details start collapsed; bottom nav does not hide required controls.
  - 768px: tablet layout has no overflow and does not collapse into a forgotten technical form.
  - 1440px: desktop primary workspace has wizard plus composer, with preview visible.
  - 1920px: three-column workspace remains visible without overlap.

## Risks

- File inputs have browser-native rendering differences; custom styling must preserve keyboard and screen-reader access.
- Hiding too much technical information may reduce diagnosability; advanced mode must remain available.
- The current fixture has disabled API buttons in demo mode, so visual checks must not assume live mutation is possible.
- A more compact mobile header could obscure useful debug details; keep those details in advanced mode.

## Rollback

Revert this plan, the Content Studio frontend changes, visual smoke updates, and the Russian report.
No data rollback is needed because this slice changes no schema and no API contracts.
