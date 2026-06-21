# Mock Data And Service Strategy

Status: UI Phase 10j partial implementation. Dashboard, publication operations, project/rubric screens, Project Builder/Wizard/Settings internals, content index/detail/new screens, Content Studio internals, mobile capture, integrations, billing, workspace, account, examples, media, calendar, AI pipeline, and project examples now use a service boundary with `NEXT_PUBLIC_DATA_MODE=api | fixtures`; the remaining feature internals still need the same migration.

## Goal

The UI must be buildable before every live connector and production provider is ready. Mock data should exercise real product states without hardcoding the first customer project into generic components.

## Rules

- Mock fixtures must conform to API/OpenAPI DTO shapes where possible.
- Generic components receive props and never import project-specific fixtures directly.
- Feature screens may select fixture scenarios through a mock service adapter.
- Fixtures must include loading, empty, error, offline, permission, limit-reached, integration-disconnected, and partial-success states.
- No credentials, tokens, cookies, webhook secrets, or real private URLs in fixtures.

## Service Layer Shape

Each feature should expose a service boundary:

```ts
export interface PublicationsService {
  listPublications(): Promise<PublicationListViewModel>;
  getAttempts(publicationId: string): Promise<PublicationAttemptViewModel[]>;
  retry(publicationId: string): Promise<PublicationViewModel>;
}
```

Implementations:

```text
services/publications-api.ts
services/publications-fixtures.ts
```

Selection:

```text
NEXT_PUBLIC_DATA_MODE=api | fixtures
```

Default for development currently stays `fixtures` so `next build` and visual checks do not require a live backend. Component showcase and visual tests should use `fixtures`. API mode can be enabled per environment once authenticated session forwarding is ready.

Implemented first slice:

- `apps/web/src/services/runtime.ts`
- `apps/web/src/services/openapi-types.ts`
- `apps/web/src/services/dashboard.ts`
- `apps/web/src/services/publications.ts`
- `apps/web/src/services/projects.ts`
- `apps/web/src/services/content.ts`
- `apps/web/src/services/workspace-settings.ts`
- `apps/web/src/services/library-planning.ts`
- `apps/web/src/services/ai.ts`
- `/app` dashboard
- `/app/publications`
- `/app/projects`
- `/app/projects/new`
- `/app/projects/[projectId]`
- `/app/projects/[projectId]/builder`
- `/app/projects/[projectId]/settings`
- `/app/projects/[projectId]/rubrics`
- `/app/projects/[projectId]/rubrics/new`
- `/app/projects/[projectId]/rubrics/[rubricId]`
- `/app/content`
- `/app/content/[contentId]` top-level summary and internal studio panels
- `/app/content/new`
- `/app/integrations`
- `/app/billing`
- `/app/workspace`
- `/app/account`
- `/app/examples`
- `/app/media`
- `/app/calendar`
- `/app/ai`
- `/app/projects/[projectId]/examples`

## Fixture Sources

Use:

- `fixtures/telegram-donika.json` for Telegram acceptance fixture.
- `presets/projects/chto-poest-armavir` seed data for realistic project/rubric structure.
- Existing OpenAPI JSON for DTO names and fields.
- Small generated fixture sets for edge states.

Do not import standalone UI reference HTML as data.

## Fixture Domains

Brand:

- default working brand: PostHub / Temichev PostHub;
- alternate brand: Медиа-хаб, to verify configurability.

Workspace/project:

- empty workspace;
- workspace with "Что поесть? Армавир" imported from preset;
- multiple projects for selector behavior;
- permission denied workspace.

Rubric builder:

- rubric with required user fields;
- rubric with repeatable dish group;
- rubric with AI-generated hook/ratings fields;
- archived rubric;
- invalid schema warning;
- plan limit reached for active rubrics.

Content Studio:

- empty draft;
- draft with voice blocks and transcript pending;
- locked facts;
- AI suggestions available;
- fact conflict error;
- platform variants valid/warning/error;
- offline local draft.

Media:

- no media;
- upload in progress;
- mixed 7-photo/3-video set;
- unsupported media warning;
- reorder state.

Integrations:

- disconnected Telegram/MAX/Instagram;
- connected healthy Telegram;
- MAX token attention required;
- Instagram account manual_required because of missing permissions/review/quota;
- generic webhook simulated;
- manual export only.

Publications:

- scheduled;
- queued/processing;
- Telegram published, Instagram failed, MAX manual_required;
- retryable failure with Retry-After;
- dead-letter;
- manual export waiting for confirmation;
- remote delete unsupported.

Billing:

- Free plan with limits;
- usage near limit;
- plan limit reached;
- payment provider coming soon.

## State Boundaries

Server state:

- Fetched through feature service.
- Cached by the future query layer.
- Revalidated after mutation.

Local draft state:

- Lives in feature-level local state plus local persistence.
- Does not become published state until API confirms.
- Handles offline text/audio metadata only.

Form state:

- Owned by screen/form components.
- Validated client-side for UX and server-side for authority.
- Uses optimistic version/ETag when backend supports it.

Publication state:

- Server-authoritative.
- Attempt history and external IDs are never mocked as final after a real mutation.
- UI can display pending optimistic "retry requested" only until refresh.

## Mock Adapter Testing

Visual tests should run against fixture services to avoid live API/network dependencies. API smoke tests remain separate and use generated OpenAPI + backend tests.

Fixture services should support scenario switching by URL query or internal showcase controls:

```text
/app/publications?scenario=partial-success
/app/content/demo?scenario=offline-draft
```

Scenario query support is for local/dev/showcase only and must not expose private data.

## UI Phase 01 Mock Scope

UI Phase 01 should add only shell/showcase fixtures:

- brand variants;
- navigation item states;
- loading/empty/error/offline/permission/limit state samples;
- dashboard counters as static showcase data.

Feature-specific rich fixtures belong to later UI phases.
