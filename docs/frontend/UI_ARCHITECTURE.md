# Frontend UI Architecture

Status: UI Phase 00 planning baseline.

## Inputs

- Repository instructions: `AGENTS.md`.
- Canonical product specification: `docs/en/*`.
- UI reference pack: `design/ui-reference/*`.
- Existing implementation through product Phase 06.

The UI reference pack is additive. It does not replace the main product specification, backend API contracts, data model, or phase order. English `docs/en` remain canonical for product behavior.

## Current Frontend State

The current frontend is a working technical shell for product Phases 01-06:

- Next.js App Router, React, TypeScript, Tailwind CSS.
- Minimal shadcn-style primitives: `Button`, `Card`, `Badge`.
- Phase-specific technical components under `apps/web/src/components/phase02` through `phase06`.
- Public/auth/cabinet routes exist, but there is no permanent app shell abstraction.
- Brand strings are currently embedded in layout/page components.
- No frontend repository/service layer, no typed client wrapper, no mock fixture layer.
- No visual regression or screenshot test setup.

This was acceptable for backend-first vertical slices. New UI work should now create a stable frontend foundation before adding more complex connector screens.

## Reference Mapping

Use one coherent product language:

- Editorial Studio: default desktop shell, dashboard, content studio, platform previews.
- Visual Builder: project wizard, rubric builder, dynamic field canvas, rules, limits, examples.
- Mobile-first PWA: phone dictation, one-field-per-step input, transcript review, compact publish approval.
- Command Center: later dark theme for operations, publication queue, calendar, analytics, and platform health.

Do not implement four separate themes.

## Adjusted Execution Order

The recommended order after product Phase 06 is:

1. UI Phase 00: architecture and planning documents only.
2. UI Phase 01: design tokens, brand config, app shells, navigation, core states, component showcase.
3. Product Phase 07: Telegram connector, implemented against the new shell and preview component plan.
4. Product Phase 08: MAX connector, reusing connector cards, capability panels, and publication status UI.
5. Product Phase 09: Instagram connector, with manual-required and account-readiness diagnostics.
6. Product Phase 10: scheduling, calendar, worker hardening, operations, backups, PWA offline hardening.
7. Later UI Phases: fill out landing/auth/dashboard, project/rubric builder, content studio, mobile PWA, integrations/publications, examples/media/calendar, billing/account/workspace.

Reasoning:

- UI Phase 00/01 reduces future rework before real Telegram/MAX/Instagram screens appear.
- Full UI implementation should not block connector backend work.
- Command Center should wait until there is real operational data from connector phases.

## App Architecture

Target Next.js structure:

```text
apps/web/src/
  app/
    (marketing)/
    (auth)/
    (cabinet)/app/
  config/
    brand.ts
    navigation.ts
  components/
    ui/
    layout/
    states/
  features/
    auth/
    dashboard/
    project-builder/
    rubric-builder/
    dynamic-forms/
    voice-recorder/
    content-studio/
    media/
    examples/
    platform-preview/
    integrations/
    publications/
    billing/
    workspace/
  lib/
    api/
    services/
    state/
    fixtures/
```

Route groups can be introduced incrementally in UI Phase 01/02. Existing URLs should remain stable or redirect cleanly.

## Brand Configuration

Brand values must move to a single frontend config:

```ts
export const brand = {
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "PostHub",
  fullName: process.env.NEXT_PUBLIC_PRODUCT_FULL_NAME ?? "Temichev PostHub",
  tagline: process.env.NEXT_PUBLIC_PRODUCT_TAGLINE ?? "Create once. Publish everywhere.",
  logoMark: "PH",
};
```

Open question: the current visible product name is "Медиа-хаб"; the UI reference pack recommends "Temichev PostHub" / "PostHub" as a working name. Until confirmed, the implementation should support both through config.

## State Boundaries

Server state:

- Workspace, project, rubric, content, media, examples, AI runs, platform variants, destinations, publications, attempts, billing, usage.
- Source of truth: API/OpenAPI-generated DTOs.
- Future client state tool: TanStack Query, after dependency approval.

Form state:

- Project wizard, rubric builder, content block forms, integration setup.
- Future tools: React Hook Form + Zod, after dependency approval.
- Forms must keep labels, descriptions, field-level errors, and optimistic version checks.

Local draft state:

- Mobile capture text, recorder state, unsynced transcript corrections, local autosave markers.
- Use local storage for simple text drafts first; IndexedDB is preferred for audio metadata/offline queues in UI Phase 06/10.
- Local draft state never authorizes publication or AI generation while offline.

Publication state:

- Server-authoritative: publication status, attempt history, outbox/dead-letter state, external IDs, remote delete support.
- UI may show local progress placeholders, but must reconcile from the backend before final status.

## Service Layer

Screens must not call `fetch` directly from deeply nested components. Use feature-scoped services:

```text
features/publications/services/publications-service.ts
features/content-studio/services/content-service.ts
features/integrations/services/integrations-service.ts
```

Each service should have:

- real API adapter;
- fixture/mock adapter;
- state builders for loading, empty, error, offline, permission, limit-reached, disconnected, partial-success cases.

## Responsive Behavior

Desktop:

- Persistent left sidebar.
- Topbar with project/workspace context, primary action, account menu.
- Editorial Studio three-column content studio where width allows.
- Visual Builder three-panel rubric editor.

Tablet:

- Collapsible sidebar or rail.
- Main panels reduce to two-column or tabbed layouts.
- Inspector and preview panels can become drawers.

Mobile:

- Bottom navigation or drawer.
- One primary action per screen.
- Content Studio becomes Mobile Capture for first-class dictation.
- Platform previews and publication confirmation use tabs/sheets.
- Controls must be at least 44 px touch targets and text inputs at least 16 px.

## Dependencies

Already present:

- Next.js, React, TypeScript, Tailwind CSS.
- Radix Slot, class-variance-authority, clsx, tailwind-merge.
- Lucide icons.

Future dependencies that need explicit approval before adding:

- React Hook Form.
- Zod.
- TanStack Query.
- dnd-kit.
- Playwright.
- Optional component-showcase tooling if not built as an internal route.

## Conflicts And Open Questions

No hard conflict was found between the main specification and the UI reference pack.

Open questions:

1. Confirm final/working brand label for UI: "Медиа-хаб" vs "Temichev PostHub" / "PostHub".
2. Confirm whether UI Phase 01 should be completed before Product Phase 07, or whether Product Phase 07 may start after UI Phase 00 with only technical UI.
3. Confirm approval to add frontend dependencies in UI Phase 01.
4. Confirm whether `Command Center` dark mode waits until Product Phase 10 or can start as part of UI Phase 07 publication operations.
5. Confirm whether screenshots can be stored in repo artifacts or should remain local CI artifacts only.

## UI Phase 01 Scope

UI Phase 01 should implement:

- `config/brand.ts` with environment overrides.
- CSS variables and Tailwind token mapping.
- Light Editorial Studio default theme.
- Core primitives: button, badge, card, input, textarea, tabs, dialog/sheet placeholders, status badge, usage meter.
- Layout components: MarketingShell, AuthShell, CabinetShell, Sidebar, Topbar, MobileNav, PageHeader, ProjectSwitcher.
- State components: LoadingState, EmptyState, ErrorState, OfflineState, PermissionState, LimitState.
- Internal component showcase route.
- Existing phase pages migrated into the new shell without changing backend contracts.
- Typecheck/lint and visual smoke screenshots at 390, 768, 1280, and 1440 widths.
