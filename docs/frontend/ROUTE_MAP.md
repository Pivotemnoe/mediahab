# Frontend Route Map

Status: UI Phase 00 planning baseline.

## Principles

- Keep URLs stable where existing product phases already introduced them.
- Use route groups later for implementation organization, not for URL changes.
- Prefer focused task routes over generic settings screens.
- Keep public, auth, and cabinet shells separate.
- Do not expose raw project/rubric JSON as the default UI.

## Public Routes

| Route | Purpose | Current State | UI Direction |
|---|---|---:|---|
| `/` | Landing | exists | Editorial Studio-inspired marketing hero and workflow preview |
| `/features` | Product capabilities | exists | Explain project builder, dictation, AI editor, platform variants |
| `/pricing` | Pricing placeholder | exists | Billing-ready but honest about mock/manual payment |
| `/security` | Security/data ownership | exists | Keep, align with security spec |
| `/contacts` | Contact | exists | Keep |
| `/terms` | Terms | exists | Keep |
| `/privacy` | Privacy | exists | Keep |

## Auth Routes

| Route | Purpose | Current State | UI Direction |
|---|---|---:|---|
| `/login` | Login | exists | AuthShell |
| `/register` | Registration | exists | AuthShell |
| `/verify-email` | Email verification | exists | AuthShell |
| `/forgot-password` | Reset request | exists | AuthShell |
| `/reset-password` | Password reset | exists | AuthShell |

## Cabinet Routes

| Route | Purpose | Current State | UI Direction |
|---|---|---:|---|
| `/app` | Dashboard alias | exists | Redirect or render same as `/app/dashboard` |
| `/app/dashboard` | Dashboard | exists | Editorial dashboard: drafts, scheduled posts, integration alerts, usage |
| `/app/projects` | Project list | exists | Project cards and create/import actions |
| `/app/projects/new` | Project wizard | exists | Visual Builder wizard |
| `/app/projects/[projectId]` | Project overview | exists | Project home with rubrics, examples, health |
| `/app/projects/[projectId]/settings` | Project settings | missing | Add in UI/API phase when settings UI is ready |
| `/app/projects/[projectId]/builder` | Project builder | exists | Keep as builder hub or redirect to settings/rubrics |
| `/app/projects/[projectId]/rubrics` | Rubric list | exists | Visual Builder rubric list |
| `/app/projects/[projectId]/rubrics/new` | New rubric | missing | Add in UI Phase 04 |
| `/app/projects/[projectId]/rubrics/[rubricId]` | Rubric editor | missing | Add in UI Phase 04 |
| `/app/projects/[projectId]/examples` | Project examples | exists | Keep as project-scoped examples |
| `/app/examples` | Cross-project examples | missing | Add in UI Phase 08 |
| `/app/content` | Content list | exists | Drafts, filters, status, create action |
| `/app/content/new` | Start content | exists | Project/rubric selection and mobile-first entry |
| `/app/content/[contentId]` | Content Studio | exists | Editorial Studio desktop and Mobile Capture responsive mode |
| `/app/calendar` | Schedule/calendar | missing | Add with Product Phase 10/UI Phase 08 |
| `/app/media` | Media library | exists | Media grid, upload status, filters |
| `/app/integrations` | Connector accounts | missing | Add with Product Phases 07-09/UI Phase 07 |
| `/app/publications` | Publication queue/history | exists | Publication cards, partial success, attempts, retry, cancel |
| `/app/billing` | Billing/usage | exists | Current plan, usage, pricing, coming-soon payment |
| `/app/workspace` | Workspace settings/members | exists | Workspace and roles |
| `/app/account` | Account/session settings | exists | Account and sessions |
| `/app/settings` | Generic settings | exists | Keep as temporary redirect or settings hub |

## Navigation Model

Desktop sidebar primary items:

```text
Dashboard
Create
Projects
Content
Calendar
Media
Examples
Integrations
Publications
Billing
Workspace
Account
```

Mobile bottom navigation should be limited to:

```text
Dashboard
Create
Content
Projects
More
```

`More` opens Media, Examples, Integrations, Publications, Billing, Workspace, Account.

## Route Group Target Structure

Implementation target:

```text
src/app/
  (marketing)/
    page.tsx
    features/page.tsx
    pricing/page.tsx
    security/page.tsx
    contacts/page.tsx
    terms/page.tsx
    privacy/page.tsx
  (auth)/
    login/page.tsx
    register/page.tsx
    verify-email/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
  (cabinet)/
    app/
      page.tsx
      dashboard/page.tsx
      projects/...
      content/...
      calendar/page.tsx
      media/page.tsx
      examples/page.tsx
      integrations/page.tsx
      publications/page.tsx
      billing/page.tsx
      workspace/page.tsx
      account/page.tsx
```

This can be introduced gradually. A route group migration must preserve visible URLs.

## Phase Mapping

| UI Phase | Route Work |
|---|---|
| UI 01 | Shell routes and component showcase |
| UI 02 | Landing, auth, dashboard |
| UI 03 | `/app/projects/new` |
| UI 04 | `/app/projects/[projectId]/rubrics/*` |
| UI 05 | `/app/content/[contentId]` desktop studio |
| UI 06 | Mobile capture flow under `/app/content/new` and `/app/content/[contentId]` |
| UI 07 | `/app/integrations`, `/app/publications` |
| UI 08 | `/app/examples`, `/app/media`, `/app/calendar` |
| UI 09 | `/app/billing`, `/app/workspace`, `/app/account` |
| UI 10 | accessibility, visual regression, performance, error boundaries |

## Differences From Current App

- `/app` and `/app/dashboard` should become the same dashboard experience.
- `/app/settings` is not in the canonical route list; keep as a temporary hub or redirect.
- `/app/integrations`, `/app/calendar`, `/app/examples`, project settings, and rubric detail routes are missing.
- The current route files directly render phase shell components. UI Phase 01 should wrap them in a durable CabinetShell first, then later replace them feature by feature.
