import Link from "next/link";
import {
  ArrowLeft,
  Blocks,
  BookOpenCheck,
  Braces,
  CheckCircle2,
  ClipboardCheck,
  CopyPlus,
  Eye,
  FileJson,
  FolderPlus,
  GripVertical,
  ListChecks,
  MessageSquare,
  PanelRight,
  Pencil,
  Plus,
  RadioTower,
  Repeat2,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Users,
  type LucideIcon,
  WandSparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type NewProjectViewModel,
  type ProjectBuilderViewModel,
  type ProjectDetailViewModel,
  type ProjectIndexViewModel,
  type ProjectSettingsViewModel,
  type RubricBuilderViewModel,
  type RubricDetailViewModel,
} from "@/services/projects";

const projectEntryPoints: Array<[string, string, LucideIcon]> = [
  ["С нуля", "Создать переиспользуемый проект без данных пресета.", FolderPlus],
  ["Из пресета", "Идемпотентно импортировать поддерживаемый пресет.", CopyPlus],
  ["Импорт пакета", "Проверить JSON проекта и рубрик перед активацией.", FileJson],
];

export function ProjectIndexShell({ viewModel }: { viewModel: ProjectIndexViewModel }) {
  return (
    <div className="grid gap-4">
      <BuilderHeader title="Проекты" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="success">Этап 03</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">
              Конструктор проектов
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Проекты хранят стабильную идентичность и неизменяемые версии
              настроек. Пресеты импортируются как данные, без ветвлений в коде.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{viewModel.modeLabel}</Badge>
            <Button asChild>
              <Link href="/app/projects/new">
                <FolderPlus size={16} />
                Новый проект
              </Link>
            </Button>
          </div>
        </div>
        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}
        <Card className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FolderPlus size={18} className="text-primary" />
            Текущие проекты
          </div>
          {viewModel.projects.map((project) => (
            <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto_auto]" key={project.href}>
              <div>
                <div className="text-sm font-semibold text-foreground">{project.name}</div>
                <div className="mt-1 text-xs leading-5 text-muted">{project.description}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={project.status === "активен" ? "success" : "warning"}>{project.status}</Badge>
                <Badge>{project.rubrics}</Badge>
                <Badge>{project.version}</Badge>
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link href={project.href}>Открыть</Link>
              </Button>
            </div>
          ))}
        </Card>
        <div className="grid gap-4 lg:grid-cols-3">
          {projectEntryPoints.map(([title, text, Icon]) => (
            <Card className="grid gap-3" key={title}>
              <Icon className="text-accent" size={20} />
              <div>
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-1 text-sm leading-6 text-muted">{text}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export function NewProjectShell({ viewModel }: { viewModel: NewProjectViewModel }) {
  return (
    <div className="grid gap-5">
      <BuilderHeader title="Новый проект" />
      <PageHeader
        actions={
          <>
            <Button type="button" variant="secondary">
              <CopyPlus size={16} />
              Импорт пресета
            </Button>
            <Button type="button">
              <FolderPlus size={16} />
              Сохранить черновик
            </Button>
          </>
        }
        description="Visual Builder для проекта: идентичность, аудитория, тон, площадки, примеры и ИИ-предложения рубрик."
        eyebrow="Этап UI 03"
        title="Мастер проекта"
      />
      {viewModel.notice ? (
        <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
          {viewModel.notice}
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[300px_1fr_340px]">
        <Card className="grid content-start gap-2">
          {viewModel.wizardSteps.map(({ status, step, text }, index) => (
            <div
              className="grid grid-cols-[24px_1fr] gap-3 rounded-md border border-border p-3"
              key={step}
            >
              <CheckCircle2 size={16} className={status === "current" ? "mt-0.5 text-success" : "mt-0.5 text-muted"} />
              <div>
                <div className={status === "current" ? "text-sm font-medium text-foreground" : "text-sm font-medium text-muted"}>
                  {index + 1}. {step}
                </div>
                <div className="mt-1 text-xs leading-5 text-muted">{text}</div>
              </div>
            </div>
          ))}
        </Card>

        <div className="grid gap-4">
          <Card className="grid gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ClipboardCheck size={18} className="text-primary" />
              Основа проекта · {viewModel.modeLabel}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {viewModel.fields.map(({ label, placeholder }) => (
                <label className="grid gap-1.5 text-sm" key={label}>
                  <span className="font-medium text-foreground">{label}</span>
                  <input
                    className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-ring/20"
                    placeholder={placeholder}
                  />
                </label>
              ))}
            </div>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-foreground">Аудитория и тон</span>
              <textarea
                className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-ring/20"
                placeholder={viewModel.audiencePlaceholder}
              />
            </label>
          </Card>

          <Card className="grid gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <RadioTower size={18} className="text-primary" />
              Площадки
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {viewModel.platformOptions.map(({ enabled, name, note }) => (
                <label className="grid gap-2 rounded-md border border-border p-3 text-sm" key={name}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground">{name}</span>
                    <input defaultChecked={enabled} type="checkbox" />
                  </span>
                  <span className="text-xs leading-5 text-muted">{note}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="grid gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Upload size={18} className="text-primary" />
              Примеры
            </div>
            <div className="rounded-md border border-dashed border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
              Загрузите тексты, фото или голосовые заметки. В этапе UI 03 это демо-блок; API-импорт подключается позже.
            </div>
            <div className="flex flex-wrap gap-2">
              {viewModel.exampleImports.map((item) => (
                <Badge key={item} tone="info">
                  {item}
                </Badge>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles size={18} className="text-primary" />
              ИИ-предложения рубрик
            </div>
            {viewModel.rubricSuggestions.map(({ mode, name, text }) => (
              <div className="grid gap-3 rounded-md border border-border p-3" key={name}>
                <div>
                  <div className="text-sm font-medium text-foreground">{name}</div>
                  <div className="mt-1 text-xs leading-5 text-muted">{text}</div>
                </div>
                <Badge tone="neutral" className="w-fit">
                  {mode}
                </Badge>
                <div className="flex gap-2">
                  <Button size="sm" type="button">
                    <CheckCircle2 size={14} />
                    Принять
                  </Button>
                  <Button size="sm" type="button" variant="secondary">
                    <Pencil size={14} />
                    Изменить
                  </Button>
                  <Button size="icon" type="button" variant="ghost">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users size={18} className="text-primary" />
              Подтверждение
            </div>
            <p className="text-sm leading-6 text-muted">
              Перед созданием проекта пользователь видит итог: название, площадки, тон, импорт примеров и выбранные рубрики.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted">
              <MessageSquare size={16} />
              Черновик можно сохранить без публикаций и без автоматического создания постов.
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

export function ProjectDetailShell({
  projectId,
  viewModel,
}: {
  projectId: string;
  viewModel: ProjectDetailViewModel;
}) {
  return (
    <div className="grid gap-4">
      <BuilderHeader title="Проект" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>Проект</Badge>
              <Badge>{viewModel.modeLabel}</Badge>
            </div>
            <h1 className="mt-3 break-all text-3xl font-semibold text-ink">
              {viewModel.projectLabel || projectId}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Стабильная идентичность с активной версией настроек.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/examples`}>
                <BookOpenCheck size={16} />
                Примеры
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/settings`}>
                <SlidersHorizontal size={16} />
                Настройки
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/builder`}>
                <WandSparkles size={16} />
                Конструктор
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/app/projects/${projectId}/rubrics`}>
                <Blocks size={16} />
                Рубрики
              </Link>
            </Button>
          </div>
        </div>
        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          {viewModel.summaryCards.map(({ note, title }) => (
            <Card key={title}>
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-2 text-sm leading-6 text-muted">
                {note}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProjectBuilderShell({
  projectId,
  viewModel,
}: {
  projectId: string;
  viewModel: ProjectBuilderViewModel;
}) {
  return (
    <div className="grid gap-4">
      <BuilderHeader title="Конструктор проекта" />
      <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="grid content-start gap-2">
          {viewModel.steps.map((step) => (
            <button
              className="h-10 rounded-md px-3 text-left text-sm text-muted hover:bg-surface hover:text-ink"
              key={step}
            >
              {step}
            </button>
          ))}
        </Card>
        <Card className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Версионируемые настройки</Badge>
            <Badge>{viewModel.modeLabel}</Badge>
          </div>
          <h1 className="text-2xl font-semibold text-ink">
            Конструктор проекта {viewModel.projectLabel || projectId}
          </h1>
          {viewModel.notice ? (
            <div className="rounded-md border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_94%)] p-3 text-sm leading-6 text-muted">
              {viewModel.notice}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {viewModel.settingCards.map(({ label, text }) => (
              <div className="rounded-md border border-line p-3" key={label}>
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-1 text-sm text-muted">
                  {text}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

export function RubricBuilderShell({
  projectId,
  viewModel,
}: {
  projectId: string;
  viewModel: RubricBuilderViewModel;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <BuilderHeader title="Конструктор рубрик" />
      <section className="grid min-w-0 gap-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 max-w-full">
            <div className="flex flex-wrap gap-2">
              <Badge>Проект {viewModel.projectLabel || projectId}</Badge>
              <Badge>{viewModel.modeLabel}</Badge>
            </div>
            <h1 className="mt-3 break-words text-2xl font-semibold text-foreground sm:text-3xl">
              Рубрики, поля и версии формы
            </h1>
            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted">
              Visual Builder для структуры материала: обязательность, источники,
              блокировка фактов, повторяемые группы и платформенные стратегии.
            </p>
          </div>
          <div className="flex max-w-full flex-wrap gap-2">
            <Button type="button" variant="secondary">
              <Eye size={16} />
              Предпросмотр формы
            </Button>
            <Button type="button">
              <Save size={16} />
              Сохранить версию
            </Button>
          </div>
        </div>

        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}

        <div className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <div className="grid min-w-0 content-start gap-4">
            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ListChecks size={18} className="text-primary" />
                Рубрики проекта
              </div>
              {viewModel.rubrics.map(({ count, href, name, status, version }) => (
                <Link
                  className="grid gap-1 rounded-md border border-border p-3 text-left text-sm transition hover:bg-surface-muted"
                  key={name}
                  href={href}
                >
                  <span className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-words font-medium text-foreground">
                      {name}
                    </span>
                    <Badge
                      className="shrink-0"
                      tone={status === "черновик" ? "warning" : "success"}
                    >
                      {status}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted">
                    {count} · {version}
                  </span>
                </Link>
              ))}
              <Button asChild variant="secondary">
                <Link href={`/app/projects/${projectId}/rubrics/new`}>
                  <Plus size={16} />
                  Добавить рубрику
                </Link>
              </Button>
            </Card>

            <Card className="grid content-start gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Braces size={18} className="text-primary" />
                Палитра полей
              </div>
              {viewModel.fieldPalette.map(({ text, title }) => (
                <button
                  className="grid gap-1 rounded-md border border-border px-3 py-2 text-left text-sm transition hover:bg-surface-muted"
                  key={title}
                  type="button"
                >
                  <span className="font-medium text-foreground">{title}</span>
                  <span className="text-xs leading-5 text-muted">{text}</span>
                </button>
              ))}
            </Card>
          </div>

          <div className="grid min-w-0 gap-4">
            <Card className="grid gap-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge tone="warning">черновик · v9</Badge>
                  <h2 className="mt-3 break-words text-xl font-semibold text-foreground">
                    Обзор недели
                  </h2>
                  <p className="mt-2 break-words text-sm leading-6 text-muted">
                    Редактирование создаст новую версию. Старые материалы
                    останутся привязаны к своей исторической версии рубрики.
                  </p>
                </div>
                <Button type="button" variant="secondary">
                  <WandSparkles size={16} />
                  Тестовая генерация
                </Button>
              </div>

              <div className="grid gap-3">
                {viewModel.rubricFields.map((field, index) => (
                  <div
                    className="grid gap-3 rounded-md border border-border p-3"
                    key={field.key}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <GripVertical className="mt-0.5 shrink-0 text-muted" size={18} />
                        <div className="min-w-0">
                          <div className="break-words text-sm font-medium text-foreground">
                            {index + 1}. {field.label}
                          </div>
                          <p className="mt-1 break-words text-xs leading-5 text-muted">
                            {field.helper}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={field.required ? "success" : "neutral"}>
                          {field.required ? "обязательное" : "опционально"}
                        </Badge>
                        <Badge tone={field.locked ? "success" : "warning"}>
                          {field.locked ? "зафиксировано" : "черновик"}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-2 text-xs text-muted sm:grid-cols-3">
                      <span className="break-words">ключ: {field.key}</span>
                      <span className="break-words">источник: {field.source}</span>
                      <span className="break-words">лимит: {field.limit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Repeat2 size={18} className="text-primary" />
                Повторяемые группы
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {viewModel.repeatableGroups.map(({ fields, max, min, name }) => (
                  <div className="rounded-md border border-border p-3" key={name}>
                    <div className="break-words text-sm font-medium text-foreground">{name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{min}</Badge>
                      <Badge>{max}</Badge>
                    </div>
                    <p className="mt-2 break-words text-xs leading-5 text-muted">{fields}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid min-w-0 content-start gap-4">
            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <PanelRight size={18} className="text-primary" />
                Инспектор поля
              </div>
              {[
                ["подпись", "Атмосфера и сервис"],
                ["источник", "пользователь + голос"],
                ["подсказка", "Опишите посадку, музыку и скорость подачи"],
              ].map(([label, value]) => (
                <label className="grid gap-1.5 text-sm" key={label}>
                  <span className="font-medium text-foreground">{label}</span>
                  <input
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                    defaultValue={value}
                  />
                </label>
              ))}
              <div className="grid gap-2">
                {["Обязательное поле", "Факт блокируется", "ИИ может предлагать правку"].map((item) => (
                  <label className="flex min-w-0 items-center gap-2 text-sm text-foreground" key={item}>
                    <input defaultChecked={item !== "ИИ может предлагать правку"} type="checkbox" />
                    <span className="min-w-0 break-words">{item}</span>
                  </label>
                ))}
              </div>
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <SlidersHorizontal size={18} className="text-primary" />
                Площадки и лимиты
              </div>
              {viewModel.platformStrategies.map(({ mode, note, platform }) => (
                <div className="rounded-md border border-border p-3" key={platform}>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <div className="break-words text-sm font-medium text-foreground">{platform}</div>
                    <Badge className="shrink-0" tone="info">{mode}</Badge>
                  </div>
                  <div className="mt-1 break-words text-xs leading-5 text-muted">{note}</div>
                </div>
              ))}
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck size={18} className="text-primary" />
                Правила стиля
              </div>
              {viewModel.styleRules.map((rule) => (
                <div className="flex min-w-0 gap-2 text-sm leading-6 text-muted" key={rule}>
                  <CheckCircle2 className="mt-1 shrink-0 text-success" size={15} />
                  <span>{rule}</span>
                </div>
              ))}
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Eye size={18} className="text-primary" />
                Предпросмотр мобильной формы
              </div>
              {viewModel.previewBlocks.map(({ index, name, note }) => (
                <div
                  className="grid grid-cols-[28px_1fr] gap-2 rounded-md border border-border p-2"
                  key={index}
                >
                  <span className="grid size-7 place-items-center rounded bg-surface-muted text-xs font-medium text-muted">
                    {index}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{name}</span>
                    <span className="block text-xs text-muted">{note}</span>
                  </span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export function NewRubricShell({
  projectId,
  viewModel,
}: {
  projectId: string;
  viewModel: RubricBuilderViewModel;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <BuilderHeader title="Новая рубрика" />
      <section className="grid min-w-0 gap-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge>Проект {viewModel.projectLabel || projectId}</Badge>
              <Badge>{viewModel.modeLabel}</Badge>
            </div>
            <h1 className="mt-3 break-words text-2xl font-semibold text-foreground sm:text-3xl">
              Черновик рубрики
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Страница готовит структуру будущей рубрики: название, slug, лимиты,
              поля, повторяемые группы и платформенные правила. Реальное
              сохранение подключается через API-мутацию отдельным срезом.
            </p>
          </div>
          <div className="flex max-w-full flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/rubrics`}>
                <ArrowLeft size={16} />
                К списку
              </Link>
            </Button>
            <Button disabled type="button">
              <Save size={16} />
              Создать после API
            </Button>
          </div>
        </div>

        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid min-w-0 gap-4">
            <Card className="grid gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ClipboardCheck size={18} className="text-primary" />
                Основные параметры
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["Название", "Например: Завтраки до 500 рублей"],
                  ["Slug", "breakfast-under-500"],
                  ["Минимум знаков", "1500"],
                  ["Максимум знаков", "4096"],
                ].map(([label, placeholder]) => (
                  <label className="grid gap-1.5 text-sm" key={label}>
                    <span className="font-medium text-foreground">{label}</span>
                    <input
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-ring/20"
                      placeholder={placeholder}
                    />
                  </label>
                ))}
              </div>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Описание сценария</span>
                <textarea
                  className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-ring/20"
                  placeholder="Кому нужна рубрика, какие факты собираем, какие границы вкуса и цены важны."
                />
              </label>
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Braces size={18} className="text-primary" />
                Стартовый набор полей
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {viewModel.fieldPalette.map(({ text, title }) => (
                  <label className="grid gap-2 rounded-md border border-border p-3 text-sm" key={title}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{title}</span>
                      <input defaultChecked={title !== "ИИ-поле"} type="checkbox" />
                    </span>
                    <span className="text-xs leading-5 text-muted">{text}</span>
                  </label>
                ))}
              </div>
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Repeat2 size={18} className="text-primary" />
                Повторяемые блоки
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {viewModel.repeatableGroups.map(({ fields, max, min, name }) => (
                  <div className="rounded-md border border-border p-3" key={name}>
                    <div className="text-sm font-medium text-foreground">{name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{min}</Badge>
                      <Badge>{max}</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted">{fields}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid min-w-0 content-start gap-4">
            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ListChecks size={18} className="text-primary" />
                Уже есть в проекте
              </div>
              {viewModel.rubrics.map((rubric) => (
                <Link
                  className="rounded-md border border-border p-3 text-sm transition hover:bg-surface-muted"
                  href={rubric.href}
                  key={rubric.id}
                >
                  <span className="block font-medium text-foreground">{rubric.name}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {rubric.status} · {rubric.count} · {rubric.version}
                  </span>
                </Link>
              ))}
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <SlidersHorizontal size={18} className="text-primary" />
                Площадки
              </div>
              {viewModel.platformStrategies.map(({ mode, note, platform }) => (
                <div className="rounded-md border border-border p-3" key={platform}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">{platform}</div>
                    <Badge tone="info">{mode}</Badge>
                  </div>
                  <div className="mt-1 text-xs leading-5 text-muted">{note}</div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RubricDetailShell({
  projectId,
  rubricId,
  viewModel,
}: {
  projectId: string;
  rubricId: string;
  viewModel: RubricDetailViewModel;
}) {
  const rubric = viewModel.selectedRubric;

  return (
    <div className="grid min-w-0 gap-5">
      <BuilderHeader title="Редактор рубрики" />
      <section className="grid min-w-0 gap-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge>Проект {viewModel.projectLabel || projectId}</Badge>
              <Badge>{viewModel.modeLabel}</Badge>
              <Badge>{rubric.status}</Badge>
            </div>
            <h1 className="mt-3 break-words text-2xl font-semibold text-foreground sm:text-3xl">
              {rubric.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Route-level редактор для конкретной рубрики. Изменения должны
              создавать новую immutable-версию; текущий экран показывает
              целевую структуру до подключения сохранения.
            </p>
          </div>
          <div className="flex max-w-full flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/rubrics`}>
                <ListChecks size={16} />
                Все рубрики
              </Link>
            </Button>
            <Button disabled type="button">
              <Save size={16} />
              Сохранить после API
            </Button>
          </div>
        </div>

        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}

        <div className="grid gap-3 text-sm md:grid-cols-4">
          {[
            ["Route id", rubricId],
            ["Версия", rubric.version],
            ["Поля", rubric.count],
            ["Сохранение", "новая версия"],
          ].map(([label, value]) => (
            <Card className="bg-surface-muted" key={label}>
              <div className="text-xs text-muted">{label}</div>
              <div className="mt-1 break-words font-medium text-foreground">{value}</div>
            </Card>
          ))}
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <Card className="grid content-start gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ListChecks size={18} className="text-primary" />
              Рубрики проекта
            </div>
            {viewModel.rubrics.map((item) => (
              <Link
                className="grid gap-1 rounded-md border border-border p-3 text-sm transition hover:bg-surface-muted"
                href={item.href}
                key={item.id}
              >
                <span className="font-medium text-foreground">{item.name}</span>
                <span className="text-xs text-muted">
                  {item.status} · {item.version}
                </span>
              </Link>
            ))}
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/rubrics/new`}>
                <Plus size={16} />
                Новая рубрика
              </Link>
            </Button>
          </Card>

          <div className="grid min-w-0 gap-4">
            <Card className="grid gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Blocks size={18} className="text-primary" />
                Полотно формы
              </div>
              {viewModel.rubricFields.map((field, index) => (
                <div className="grid gap-3 rounded-md border border-border p-3" key={field.key}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <GripVertical className="mt-0.5 shrink-0 text-muted" size={18} />
                      <div className="min-w-0">
                        <div className="break-words text-sm font-medium text-foreground">
                          {index + 1}. {field.label}
                        </div>
                        <p className="mt-1 break-words text-xs leading-5 text-muted">
                          {field.helper}
                        </p>
                      </div>
                    </div>
                    <Badge tone={field.required ? "success" : "neutral"}>
                      {field.required ? "обязательное" : "опционально"}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-xs text-muted sm:grid-cols-3">
                    <span>ключ: {field.key}</span>
                    <span>источник: {field.source}</span>
                    <span>лимит: {field.limit}</span>
                  </div>
                </div>
              ))}
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Eye size={18} className="text-primary" />
                Предпросмотр формы
              </div>
              {viewModel.previewBlocks.map(({ index, name, note }) => (
                <div className="grid grid-cols-[28px_1fr] gap-2 rounded-md border border-border p-2" key={index}>
                  <span className="grid size-7 place-items-center rounded bg-surface-muted text-xs font-medium text-muted">
                    {index}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{name}</span>
                    <span className="block text-xs text-muted">{note}</span>
                  </span>
                </div>
              ))}
            </Card>
          </div>

          <div className="grid min-w-0 content-start gap-4">
            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <PanelRight size={18} className="text-primary" />
                Инспектор версии
              </div>
              {[
                ["Название", rubric.name],
                ["Статус", rubric.status],
                ["Лимит", rubric.count],
              ].map(([label, value]) => (
                <label className="grid gap-1.5 text-sm" key={label}>
                  <span className="font-medium text-foreground">{label}</span>
                  <input
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                    defaultValue={value}
                  />
                </label>
              ))}
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck size={18} className="text-primary" />
                Правила стиля
              </div>
              {viewModel.styleRules.map((rule) => (
                <div className="flex gap-2 text-sm leading-6 text-muted" key={rule}>
                  <CheckCircle2 className="mt-1 shrink-0 text-success" size={15} />
                  <span>{rule}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ProjectSettingsShell({
  projectId,
  viewModel,
}: {
  projectId: string;
  viewModel: ProjectSettingsViewModel;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      <BuilderHeader title="Настройки проекта" />
      <section className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>Проект {viewModel.projectLabel || projectId}</Badge>
              <Badge>{viewModel.modeLabel}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
              Идентичность, доступы и версии
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Настройки проекта должны сохраняться версионируемо: изменение
              голоса, площадок или лимитов не меняет исторические материалы.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}`}>
                <ArrowLeft size={16} />
                В проект
              </Link>
            </Button>
            <Button disabled type="button">
              <Save size={16} />
              Сохранить после API
            </Button>
          </div>
        </div>
        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-4">
            <Card className="grid gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ClipboardCheck size={18} className="text-primary" />
              Профиль проекта
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {viewModel.profileFields.map(({ label, value }) => (
                  <label className="grid gap-1.5 text-sm" key={label}>
                    <span className="font-medium text-foreground">{label}</span>
                    <input
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                      defaultValue={value}
                    />
                  </label>
                ))}
              </div>
            </Card>

            <Card className="grid gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <RadioTower size={18} className="text-primary" />
              Площадки проекта
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {viewModel.platformOptions.map(({ enabled, name, note }) => (
                  <label className="grid gap-2 rounded-md border border-border p-3 text-sm" key={name}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{name}</span>
                      <input defaultChecked={enabled} type="checkbox" />
                    </span>
                    <span className="text-xs leading-5 text-muted">{note}</span>
                  </label>
                ))}
              </div>
            </Card>

            <Card className="grid gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users size={18} className="text-primary" />
              Роли и публикация
              </div>
              {viewModel.roleNotes.map(({ note, role }) => (
                <div className="rounded-md border border-border p-3 text-sm" key={role}>
                  <div className="font-medium text-foreground">{role}</div>
                  <div className="mt-1 text-muted">{note}</div>
                </div>
              ))}
            </Card>
          </div>

          <div className="grid content-start gap-4">
            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck size={18} className="text-primary" />
              Версионность
              </div>
              {viewModel.versionNotes.map((item) => (
                <div className="flex gap-2 text-sm leading-6 text-muted" key={item}>
                  <CheckCircle2 className="mt-1 shrink-0 text-success" size={15} />
                  <span>{item}</span>
                </div>
              ))}
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileJson size={18} className="text-primary" />
                Импорт и экспорт
              </div>
              <p className="text-sm leading-6 text-muted">
                JSON-пакеты остаются форматом переноса пресетов и резервного
                экспорта. Приложение не должно хранить секреты в пакетах.
              </p>
              <Button type="button" variant="secondary">
                <FileJson size={16} />
                Экспортировать пакет
              </Button>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

function BuilderHeader({ title }: { title: string }) {
  return (
    <PageHeader
      actions={
        <Button asChild variant="secondary">
          <Link href="/app">
            <ArrowLeft size={16} />
            Кабинет
          </Link>
        </Button>
      }
      description="Visual Builder для проектов, рубрик, пресетов и версионируемых настроек."
      eyebrow="Этап 03"
      title={title}
    />
  );
}
