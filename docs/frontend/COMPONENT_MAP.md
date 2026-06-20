# Frontend Component Map

Status: UI Phase 00 planning baseline.

## Layers

```text
App routes
  -> Shell/layout components
  -> Feature screens
  -> Feature widgets
  -> Shared product components
  -> UI primitives
  -> Design tokens
```

Routes should compose feature screens. Feature screens should use services/repositories instead of embedding API calls or fixture data.

## Target Folder Structure

```text
apps/web/src/
  config/
    brand.ts
    navigation.ts
  components/
    ui/
    layout/
    states/
    feedback/
  features/
    dashboard/
    project-builder/
    rubric-builder/
    dynamic-forms/
    voice-recorder/
    content-studio/
    ai-editor/
    platform-preview/
    integrations/
    publications/
    examples/
    media/
    billing/
    workspace/
    account/
  lib/
    api/
    services/
    fixtures/
    state/
```

## Core Layout Components

| Component | Purpose | Source Reference |
|---|---|---|
| `MarketingShell` | Public pages | Editorial Studio landing |
| `AuthShell` | Login/register/reset flows | Simple branded shell |
| `CabinetShell` | Authenticated app wrapper | Editorial Studio |
| `Sidebar` | Desktop navigation | Editorial Studio |
| `Topbar` | Search/context/primary actions | Editorial Studio |
| `MobileNav` | Phone bottom navigation | Mobile-first PWA |
| `ProjectSwitcher` | Workspace/project context | Editorial Studio |
| `PageHeader` | Title, eyebrow, status, actions | All |
| `ActionBar` | Sticky page-level actions | Editorial Studio |

## UI Primitives

Extend current minimal primitives into:

```text
Button
IconButton
Input
Textarea
Select
Checkbox
Switch
Tabs
Card
Badge
StatusBadge
Progress
UsageMeter
Dialog
Sheet
Popover
Tooltip
Toast
Skeleton
```

Rules:

- Use Lucide icons where a symbol is expected.
- Keep visible focus states.
- Provide labels/errors for form controls.
- Use semantic status/tone props instead of raw color classes in feature code.

## State Components

Every major screen should have explicit states:

```text
LoadingState
EmptyState
ErrorState
OfflineState
PermissionState
LimitReachedState
DisconnectedIntegrationState
PartialSuccessState
```

These states must be reusable and fixture-driven for visual tests.

## Product Components

Project and rubric:

```text
ProjectCard
ProjectWizardStepper
ProjectPlatformSelector
RubricCard
RubricVersionBadge
RubricFieldPalette
RubricFieldRow
RubricCanvas
FieldSettingsPanel
GeneratedFieldMarker
MobileFormPreview
```

Content and voice:

```text
ContentBlockList
SourceBlockCard
RepeatableGroupList
VoiceRecorder
RecordingStatus
TranscriptEditor
FactLock
AutosaveStatus
MasterDraftEditor
RevisionHistory
AiSuggestionBadge
AiDiffPanel
RatingSuggestionEditor
```

Media:

```text
MediaGrid
MediaTile
UploadDropzone
MediaOrderList
MediaCompatibilityWarning
CoverSelector
```

Platform preview:

```text
CharacterBudget
PlatformPreviewTabs
TelegramPreview
TelegramRichMessagePreview
TelegramFallbackPreview
MaxPreview
InstagramPreview
ManualExportPreview
GenericWebhookPreview
ValidationChecklist
```

Integrations and publications:

```text
IntegrationCard
ConnectorHealthBadge
CapabilityList
TokenHealthPanel
DestinationCard
PublicationStatusCard
PublicationAttemptTimeline
PublicationConfirmationDialog
ScheduleModal
RetryAction
RemoteDeleteAction
ManualConfirmationPanel
```

Billing and operations:

```text
PlanCard
UsageMeter
InvoiceList
TeamMemberRow
AuditEventRow
CalendarGrid
OperationsQueue
```

## Current Component Migration

Current phase components should be treated as temporary feature shells:

| Existing Component | Future Home |
|---|---|
| `phase02/auth-page.tsx` | `features/auth` |
| `phase02/public-page.tsx` | `features/marketing` |
| `phase02/cabinet-page.tsx` | replaced by `CabinetShell` |
| `phase03/project-builder-shell.tsx` | `features/project-builder` and `features/rubric-builder` |
| `phase04/content-studio-shell.tsx` | `features/content-studio` and `features/voice-recorder` |
| `phase05/ai-pipeline-shell.tsx` | `features/ai-editor` and `features/examples` |
| `phase06/publication-core-shell.tsx` | `features/publications`, `features/platform-preview`, `features/integrations` |

Migration should happen incrementally. Do not rewrite all phase shells in UI Phase 01.

## Component Ownership Rules

- Generic primitives never know about "Что поесть? Армавир".
- Product components receive data through typed props.
- Feature screens own service calls and map DTOs into view models.
- Connector-specific preview components may know Telegram/MAX/Instagram rules, but hard limits still come from backend capabilities.
- Publication action components must show permission, offline, limit, and integration-disconnected states.

## UI Phase 01 Component Scope

Build only:

- brand config;
- core design tokens;
- `MarketingShell`, `AuthShell`, `CabinetShell`;
- `Sidebar`, `Topbar`, `MobileNav`, `PageHeader`;
- state components;
- polished versions of `Button`, `Card`, `Badge`, `StatusBadge`, `UsageMeter`;
- internal component showcase.

Do not implement full project/rubric/content/publication screens in UI Phase 01.
