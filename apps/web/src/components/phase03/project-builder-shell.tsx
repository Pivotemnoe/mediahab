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
  Mic,
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
  WandSparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PilotUnavailable } from "@/components/layout/pilot-unavailable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectCreateForm } from "@/components/phase12/project-create-form";
import { RubricCreateForm } from "@/components/phase12/rubric-create-form";
import { ProjectRulesForm } from "@/components/phase12/project-rules-form";
import { RubricRulesForm } from "@/components/phase12/rubric-rules-form";
import {
  type NewProjectViewModel,
  type ProjectBuilderViewModel,
  type ProjectDetailViewModel,
  type ProjectIndexViewModel,
  type ProjectSettingsViewModel,
  type RubricBuilderViewModel,
  type RubricDetailViewModel,
} from "@/services/projects";

export function ProjectIndexShell({ viewModel }: { viewModel: ProjectIndexViewModel }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="mt-3 text-3xl font-semibold text-ink">
              Мои каналы
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Для каждого блога, бренда или направления можно сохранить отдельный стиль, примеры и повторяющиеся форматы.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/app/projects/new">
                <FolderPlus size={16} />
                Новый канал
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
          {viewModel.projects.length ? viewModel.projects.map((project) => {
            const showStatus = project.status !== "активен";
            const showFormats = project.rubrics !== "без отдельных форматов";
            return (
              <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto_auto]" key={project.href}>
                <div>
                  <div className="text-sm font-semibold text-foreground">{project.name}</div>
                  <div className="mt-1 text-xs leading-5 text-muted">{project.description}</div>
                </div>
                {showStatus || showFormats ? (
                  <div className="flex flex-wrap gap-2">
                    {showStatus ? <Badge tone="warning">{project.status}</Badge> : null}
                    {showFormats ? <Badge>{project.rubrics}</Badge> : null}
                  </div>
                ) : null}
                <Button asChild size="sm" variant="secondary">
                  <Link href={project.href}>Открыть канал</Link>
                </Button>
              </div>
            );
          }) : (
            <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-border bg-surface-muted p-5">
              <div className="text-base font-semibold text-foreground">Пока нет ни одного канала</div>
              <p className="max-w-xl text-sm leading-6 text-muted">
                Создай канал, чтобы «Наговори» запомнил его стиль и подготовил первую публикацию.
              </p>
              <Button asChild>
                <Link href="/app/projects/new">
                  <FolderPlus size={16} />
                  Создать первый канал
                </Link>
              </Button>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

export function NewProjectShell({
  initialStandaloneIdeaToken,
  viewModel,
}: {
  initialStandaloneIdeaToken?: string;
  viewModel: NewProjectViewModel;
}) {
  return (
    <div className="grid gap-5">
      <BuilderHeader title="Новый канал" />
      {viewModel.notice ? (
        <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
          {viewModel.notice}
        </Card>
      ) : null}
      <ProjectCreateForm
        initialStandaloneIdeaToken={initialStandaloneIdeaToken}
        workspaceId={viewModel.workspaceId}
      />
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
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>Канал</Badge>
            </div>
            <h1 className="mt-3 break-all text-3xl font-semibold text-ink">
              {viewModel.projectLabel || projectId}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Здесь «Наговори» хранит стиль, примеры и форматы этого канала.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/app/content/new?project=${projectId}`}>
                <Mic size={16} />
                Наговорить публикацию
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/examples`}>
                <BookOpenCheck size={16} />
                Мой стиль
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/settings`}>
                <SlidersHorizontal size={16} />
                Как писать для канала
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/app/projects/${projectId}/rubrics`}>
                <Blocks size={16} />
                Форматы
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
    <div className="grid min-w-0 gap-5">
      <BuilderHeader title="Конструктор проекта" />
      <section className="grid min-w-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <Card className="grid min-w-0 content-start gap-3 p-3">
          <div className="px-2 py-1 text-xs font-semibold uppercase text-muted">Разделы проекта</div>
          {viewModel.steps.map((step, index) => (
            <button
              className={
                index === 0
                  ? "grid min-w-0 gap-1 rounded-md border border-primary bg-[color-mix(in_srgb,var(--primary),transparent_90%)] px-3 py-3 text-left"
                  : "grid min-w-0 gap-1 rounded-md border border-transparent px-3 py-3 text-left transition hover:border-border hover:bg-surface-muted"
              }
              key={step}
              type="button"
            >
              <span className="break-words text-sm font-semibold text-foreground">{step}</span>
              <span className="break-words text-xs leading-5 text-muted">
                {index === 0 ? "открыто сейчас" : "настройка доступна в этом разделе"}
              </span>
            </button>
          ))}
          <Button asChild variant="secondary">
            <Link href={`/app/projects/${projectId}`}>
              <ArrowLeft size={16} />
              К проекту
            </Link>
          </Button>
        </Card>

        <div className="grid min-w-0 gap-4">
          <Card className="grid min-w-0 gap-5 border-transparent p-5 shadow-popover sm:p-6">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="warning">advanced</Badge>
                  <Badge>версии настроек</Badge>
                </div>
                <h1 className="mt-3 break-words text-3xl font-semibold leading-tight text-foreground">
                  Конструктор проекта {viewModel.projectLabel || projectId}
                </h1>
                <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted">
                  Здесь настраиваются голос проекта, рубрики, правила ИИ, площадки и примеры.
                  Обычное создание материала остаётся в мастере, без служебных настроек на первом экране.
                </p>
              </div>
              <Button asChild>
                <Link href="/app/content/new">
                  <Plus size={16} />
                  Создать материал
                </Link>
              </Button>
            </div>

            {viewModel.notice ? (
              <div className="rounded-md border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_94%)] p-3 text-sm leading-6 text-muted">
                {viewModel.notice}
              </div>
            ) : null}

            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              {viewModel.settingCards.map(({ label, text }) => (
                <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-4" key={label}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="break-words text-base font-semibold text-foreground">{label}</div>
                    <Badge tone="info">версия</Badge>
                  </div>
                  <div className="break-words text-sm leading-6 text-muted">{text}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            {[
              {
                icon: WandSparkles,
                text: "ИИ предлагает рубрики и структуру, но не включает их без подтверждения.",
                title: "ИИ-предложения",
              },
              {
                icon: ShieldCheck,
                text: "Правила, ограничения и факты меняются через версионируемые настройки.",
                title: "Контроль качества",
              },
              {
                icon: RadioTower,
                text: "Площадки подключаются отдельно: Telegram, MAX, Instagram и ручной экспорт.",
                title: "Площадки",
              },
            ].map(({ icon: Icon, text, title }) => (
              <Card className="grid min-w-0 gap-3" key={title}>
                <Icon className="text-primary" size={20} />
                <div className="break-words text-sm font-semibold text-foreground">{title}</div>
                <p className="break-words text-sm leading-6 text-muted">{text}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="grid min-w-0 content-start gap-4 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="text-primary" size={18} />
            Предпросмотр изменений
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="text-lg font-semibold text-foreground">Новая версия настроек</div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Сохранение создаёт новую версию проекта. Уже созданные материалы остаются привязаны к прежним настройкам.
            </p>
          </div>
          <div className="grid gap-2">
            <Button type="button" variant="secondary">
              <Eye size={16} />
              Предпросмотр формы
            </Button>
            <Button type="button">
              <Save size={16} />
              Сохранить версию
            </Button>
          </div>
          <div className="rounded-md bg-surface-muted p-3 text-sm leading-6 text-muted">
            Этот раздел не участвует в обычном создании материала. Пользовательский путь начинается в мастере материала.
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
  if (viewModel.modeLabel === "api" || viewModel.modeLabel === "fixtures") {
    return (
      <div className="grid min-w-0 gap-5">
        <section className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="success">Необязательная настройка</Badge>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">
                Форматы канала «{viewModel.projectLabel || projectId}»
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Добавляй отдельный формат только для повторяющихся публикаций со своими правилами. Обычные публикации можно создавать без него.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href={`/app/projects/${projectId}`}>Открыть канал</Link>
              </Button>
              {viewModel.rubrics.length ? <Button asChild>
                <Link href={`/app/projects/${projectId}/rubrics/new`}>
                  <Plus size={16} />
                  Добавить формат
                </Link>
              </Button> : null}
            </div>
          </div>

          {viewModel.notice ? (
            <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
              {viewModel.notice}
            </Card>
          ) : null}

          <Card className="grid gap-3">
            {viewModel.rubrics.length ? viewModel.rubrics.map(({ count, href, name, status }) => (
              <div className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-[1fr_auto_auto] md:items-center" key={href}>
                <div>
                  <div className="font-semibold text-foreground">{name}</div>
                  <div className="mt-1 text-sm text-muted">{count}</div>
                </div>
                <Badge tone={status === "черновик" ? "warning" : "success"}>{status}</Badge>
                <Button asChild size="sm" variant="secondary">
                  <Link href={href}>Открыть правила</Link>
                </Button>
              </div>
            )) : (
              <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-border bg-surface-muted p-6">
                <BookOpenCheck className="text-primary" size={22} />
                <div className="text-lg font-semibold text-foreground">Отдельных форматов пока нет — и это нормально</div>
                <p className="max-w-xl text-sm leading-6 text-muted">
                  Можно сразу создавать обычные публикации. Добавь формат позже, если понадобится особая подача или структура.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/app/content/new?project=${projectId}`}>
                      <Mic size={16} />
                      Наговорить обычную публикацию
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/app/projects/${projectId}/rubrics/new`}>
                      <Plus size={16} />
                      Добавить формат
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>
    );
  }

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
  if (viewModel.modeLabel === "api" || viewModel.modeLabel === "fixtures") {
    return <RubricCreateForm projectId={projectId} projectLabel={viewModel.projectLabel || "Канал"} />;
  }

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

  if (viewModel.rawRubric) {
    return (
      <div className="grid min-w-0 gap-5">
        <BuilderHeader title="Правила формата" />
        <RubricRulesForm projectId={projectId} rubric={viewModel.rawRubric} />
      </div>
    );
  }

  if (!viewModel.rawRubric) {
    return (
      <PilotUnavailable
        backHref={`/app/projects/${projectId}/rubrics`}
        backLabel="К форматам"
        description="Этот формат сейчас не загрузился. Обнови страницу и попробуй открыть его снова."
        title="Не удалось открыть формат"
      />
    );
  }

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
  if (viewModel.project) {
    return <ProjectRulesForm project={viewModel.project} projectId={projectId} />;
  }

  if (!viewModel.project) {
    return (
      <PilotUnavailable
        backHref={`/app/projects/${projectId}`}
        backLabel="К каналу"
        description="Правила канала сейчас не загрузились. Обнови страницу и попробуй ещё раз."
        title="Не удалось открыть правила"
      />
    );
  }

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
      description="Здесь хранятся стиль, примеры и повторяющиеся форматы каждого канала."
      eyebrow="Каналы"
      title={title}
    />
  );
}
