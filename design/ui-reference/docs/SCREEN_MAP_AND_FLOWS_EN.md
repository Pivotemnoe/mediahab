# Screen Map and User Flows

## Public routes

```text
/
/features
/pricing
/login
/register
/verify-email
/forgot-password
/reset-password
```

## Authenticated routes

```text
/app/dashboard
/app/projects
/app/projects/new
/app/projects/[projectId]
/app/projects/[projectId]/settings
/app/projects/[projectId]/rubrics
/app/projects/[projectId]/rubrics/new
/app/projects/[projectId]/rubrics/[rubricId]
/app/content
/app/content/new
/app/content/[contentId]
/app/calendar
/app/media
/app/examples
/app/integrations
/app/publications
/app/billing
/app/workspace
/app/account
```

## Core screens

### Dashboard
Projects, create-content CTA, recent drafts, scheduled publications, integration errors, and plan usage.

### Project Wizard
Name, topic, audience, tone, humor, platforms, example import, AI rubric suggestions, confirmation.

### Rubric Builder
Dynamic fields, repeatable groups, required state, data source, fact locking, editorial limits, platform strategies, style rules, examples, and test generation.

### Content Studio

```text
Left: source blocks and voice input
Center: master draft and revision history
Right: platform previews, checks, and character budgets
```

### Mobile Capture
One field per step, voice capture, transcription review, fact confirmation, assemble, compact preview, and explicit publish approval.

### Integrations
Connection status, destination, permissions, token health, connector capabilities, test connection, reconnect, and disconnect.

### Publications
Independent status per platform, external ID/link, attempts, errors, retry, cancel, and remote delete when supported.

## Required states

```text
loading
empty
error
offline
permission denied
plan limit reached
integration disconnected
partial publication success
```
