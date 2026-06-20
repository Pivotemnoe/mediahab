# Design Tokens

Status: UI Phase 00 planning baseline.

## Token Strategy

Use CSS variables as the source of truth and map them into Tailwind tokens. Feature components should consume semantic tokens, not raw hex values.

The default theme is a light Editorial Studio theme. Visual Builder and Mobile PWA may add accent context, but they must not become separate design systems. Command Center dark mode is deferred.

## Default Light Theme

Editorial Studio reference baseline:

```css
:root {
  --background: #f4f0e8;
  --background-grid: rgba(89, 73, 52, 0.055);
  --surface: #fffdf8;
  --surface-muted: #f2eadf;
  --foreground: #201f1a;
  --foreground-muted: #716c62;
  --border: #ded4c5;
  --primary: #e25b33;
  --primary-foreground: #ffffff;
  --success: #3c7a62;
  --warning: #b7791f;
  --danger: #b42318;
  --focus-ring: #e25b33;
  --sidebar: #27251f;
  --sidebar-foreground: #f7f1e8;
}
```

## Optional Context Accents

Visual Builder can use a secondary builder accent for field/schema editing:

```css
--builder-accent: #6d54e8;
```

Mobile capture can use a voice context accent when it improves affordance:

```css
--voice-accent: #f26722;
--voice-success: #2f7b4a;
```

These are contextual accents. The product still has one primary action color in the default shell.

## Deferred Dark Operations Theme

Command Center theme is reserved for later operations:

```css
[data-theme="operations-dark"] {
  --background: #090d12;
  --surface: #101720;
  --surface-muted: #151f2b;
  --foreground: #f4f7fb;
  --foreground-muted: #94a3b8;
  --border: #243244;
  --primary: #a7f542;
  --primary-foreground: #0b1108;
}
```

Do not implement dark mode before a dedicated UI phase unless publication operations require it.

## Tailwind Mapping

Target Tailwind aliases:

```ts
colors: {
  background: "var(--background)",
  surface: "var(--surface)",
  "surface-muted": "var(--surface-muted)",
  foreground: "var(--foreground)",
  muted: "var(--foreground-muted)",
  border: "var(--border)",
  primary: "var(--primary)",
  "primary-foreground": "var(--primary-foreground)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  ring: "var(--focus-ring)",
  sidebar: "var(--sidebar)",
  "sidebar-foreground": "var(--sidebar-foreground)",
}
```

Existing Tailwind names (`surface`, `ink`, `line`, `accent`) should be migrated gradually or aliased during UI Phase 01.

## Radii

Use consistent radius tokens:

```css
--radius-xs: 6px;
--radius-sm: 10px;
--radius-md: 14px;
--radius-lg: 18px;
--radius-xl: 22px;
```

Guidance:

- Buttons and inputs: 10-14 px.
- Cards and panels: 16-20 px.
- Large mobile recorder surfaces: 20-22 px.
- Avoid nested card-in-card patterns.

## Spacing

Base scale:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

Application shell:

- Desktop page padding: 24-32 px.
- Mobile page padding: 16 px.
- Panel gap: 16-24 px.
- Compact repeated rows: 8-12 px internal gap.

## Typography

Use system sans-serif initially. Inter may be added later only if approved and loaded without hurting performance.

Tokens:

```text
display: 40-56 / 1.05, landing only
h1: 28-36 / 1.15
h2: 22-28 / 1.2
h3: 18-20 / 1.25
body: 14-16 / 1.5
small: 12-13 / 1.45
editor: 16 / 1.6 minimum on mobile
```

Do not scale font sizes with viewport width.

## Shadows And Borders

Use borders over heavy shadows:

```css
--shadow-panel: 0 1px 2px rgba(16, 24, 40, 0.06);
--shadow-popover: 0 16px 40px rgba(32, 31, 26, 0.12);
```

Cards use `border: 1px solid var(--border)` plus `--shadow-panel` only where separation is needed.

## Status Tones

```text
success: ready, connected, published, completed
warning: draft warning, pending, manual_required, limit near
danger: failed, disconnected, blocked, destructive
neutral: queued, processing, unknown, disabled
info: AI suggestion, generated value, system note
```

Never rely on color alone; include text labels and icons.

## Accessibility

- Focus ring uses `--focus-ring`, 2 px minimum, visible on all controls.
- Contrast target is WCAG AA.
- Touch target minimum is 44 px.
- Recorder and publication states need screen-reader announcements.
- Respect `prefers-reduced-motion`.

## UI Phase 01 Token Scope

UI Phase 01 should implement:

- CSS variables in `globals.css`.
- Tailwind mapping.
- Brand metadata integration.
- Light Editorial Studio theme only.
- No Command Center dark mode yet.
