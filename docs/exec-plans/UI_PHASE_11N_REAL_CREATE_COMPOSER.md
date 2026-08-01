# UI Phase 11N — Real Create Material Composer

## Goal

Replace the real `/app/content/new` preflight screen with a polished app-like material creation composer.
The user should understand the service path immediately: choose project/rubric, create a material, then continue into voice/text/media capture, AI assembly, platform previews, and manual publication confirmation.

## Trigger

The owner reviewed the live app and pointed out that the redesigned premium surface was not applied to the real creation entry.
The visible `/app/content/new` screen still reads like a technical preflight with hints and non-recording explanations.

## Current Audit

- `/app/content/new` renders `NewContentShell` from `apps/web/src/components/phase04/content-studio-shell.tsx`.
- The page still exposes old normal-flow copy:
  - `Подсказки`;
  - `Здесь запись не идёт`;
  - `Что уже подключено в пилоте`;
  - status rows such as `Последний блок`.
- The screen does not use the premium reference pack's primary creation patterns:
  - mobile home with a large dictation/text entry;
  - desktop composer with project/rubric selector, block stepper, capture surface, and live preview;
  - simple platform cards before publication.
- The backend action is already available through `startPilotContentAction`; this slice should keep that contract unchanged.

## Scope

- Redesign only the real `/app/content/new` screen.
- Remove the normal-flow hint/preflight/non-recording cards and replace them with:
  - project/rubric selector surface;
  - primary `Создать материал` action that still calls `startPilotContentAction`;
  - big dictation/text/media entry choices as the expected next step;
  - compact material block stepper;
  - Telegram/MAX/Instagram preview readiness cards;
  - explicit manual confirmation copy.
- Keep all visible UI Russian.
- Keep backend API contracts and server actions unchanged.
- Keep advanced/technical behavior out of the normal creation entry.
- Add or update visual smoke coverage for `/app/content/new` at 390px, 768px, 1440px, and 1920px.
- Add a Russian report after implementation.

## Out Of Scope

- New routes or demo pages.
- Backend schema changes.
- OpenAPI or typed client regeneration.
- Authentication changes.
- Real publication attempts.
- Full redesign of dashboard, project builder, billing, account, or advanced diagnostic screens.

## Assumptions

- `Обзор места` remains a UX template label over the current preset-backed rubric until the persisted template-name question is resolved.
- The creation button may stay disabled/hidden in non-API mode exactly as before.
- The normal creation entry should not show UUIDs, API labels, fact-lock counters, raw history, outbox, webhooks, publication attempts, or debug banners.

## Migrations

No database migration is planned.

## Tests

- `make typecheck`
- `make lint`
- `/Users/konstantin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm --filter @temichev/web build`
- `make test`
- `make validate-spec`
- `git diff --check`
- New `/app/content/new` visual smoke:
  - 390px, 768px, 1440px, and 1920px;
  - no horizontal overflow;
  - project/rubric selector visible;
  - primary create action visible in API mode;
  - dictation/text/media entry visible;
  - platform preview cards visible;
  - old preflight copy absent from normal flow.

## Risks

- The actual capture still happens after the material is created, so the UI must present dictation/text/media as the next action, not fake an active recording before a content item exists.
- Some source labels still come from existing preset data; avoid turning them into application logic.
- A stronger create screen could look like a landing page if it explains too much. Keep it as an app composer, not marketing content.

## Rollback

Revert this plan, the `/app/content/new` frontend changes, the visual smoke script/update, and the Russian report.
No data rollback is needed because this slice changes no schema and no API contract.
