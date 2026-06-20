# Дизайн-система

## Техническая основа

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Radix primitives
Lucide icons
React Hook Form
Zod
```

## Токены

Все цвета, размеры, радиусы, тени и интервалы задаются через CSS variables и Tailwind tokens.

Минимальный набор:

```text
--background
--surface
--surface-muted
--foreground
--foreground-muted
--border
--primary
--primary-foreground
--success
--warning
--danger
--focus-ring
```

## Рекомендованный визуальный базис

- светлый нейтральный фон;
- белые/молочные рабочие поверхности;
- один насыщенный акцентный цвет;
- зелёный только для успеха и готовности;
- жёлтый/оранжевый для предупреждений;
- красный для ошибок и опасных действий;
- радиусы 12–20 px;
- аккуратные границы вместо тяжёлых теней;
- плотность medium, не перегруженная.

## Типографика

- системный sans-serif или Inter;
- крупные заголовки только на landing;
- рабочий текст 14–16 px;
- ввод и редактор не меньше 16 px на мобильных устройствах;
- line-height 1.45–1.65;
- не использовать чрезмерно мелкие подписи.

## Компоненты первого уровня

```text
AppShell
Sidebar
Topbar
ProjectSwitcher
PageHeader
PrimaryAction
StatusBadge
UsageMeter
EmptyState
ErrorState
ConfirmDialog
Toast
```

## Продуктовые компоненты

```text
ProjectCard
RubricCard
RubricFieldRow
FieldSettingsPanel
VoiceRecorder
TranscriptEditor
FactLock
AiSuggestionBadge
CharacterBudget
PlatformPreviewTabs
TelegramPreview
MaxPreview
InstagramPreview
MediaGrid
PublicationStatusCard
IntegrationCard
ExamplePostCard
```

## Responsive breakpoints

Проверять минимум:

```text
390 × 844
768 × 1024
1280 × 800
1440 × 900
```

На мобильном:

- sidebar заменяется нижней навигацией или drawer;
- контент-студия становится пошаговой;
- previews открываются вкладками;
- основные кнопки доступны большим пальцем;
- размер интерактивной зоны не меньше 44 px.

## Accessibility

- keyboard navigation;
- visible focus;
- aria-label для иконок;
- корректные label/error для форм;
- контраст WCAG AA;
- reduced motion;
- поддержка screen reader для статусов записи и публикации.
