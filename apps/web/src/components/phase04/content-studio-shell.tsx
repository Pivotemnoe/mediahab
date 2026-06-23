import Link from "next/link";
import { type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Filter,
  GripVertical,
  History,
  ImagePlus,
  LayoutTemplate,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Mic,
  PanelRight,
  Plus,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { LearningHints } from "@/components/layout/learning-hints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AddRepeatableGroupActionForm,
  GuidedFieldActionForm,
} from "@/components/phase04/guided-form-actions";
import { PilotVoiceTelegramPanel } from "@/components/phase04/pilot-voice-telegram-panel";
import { startPilotContentAction } from "@/services/content-actions";
import {
  type ContentIndexViewModel,
  type ContentStudioViewModel,
  type MaterialCaptureFlowViewModel,
  type NewContentViewModel,
} from "@/services/content";
import { type MediaLibraryViewModel } from "@/services/library-planning";

function StudioHeader({ title, label = "Этап 04" }: { title: string; label?: string }) {
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
      description="Редакционная студия для сбора фактов, диктовки, медиа и фиксации источников."
      eyebrow={label}
      title={title}
    />
  );
}

function GuidedFieldControl({
  canMutate,
  field,
}: {
  canMutate: boolean;
  field: ContentStudioViewModel["guidedForm"]["fields"][number];
}) {
  const placeholder = field.required ? "Нужно заполнить перед сборкой" : "Можно заполнить позже";

  if (field.inputKind === "textarea") {
    return (
      <textarea
        className="min-h-28 resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-6 outline-none"
        defaultValue={field.value}
        name="value"
        placeholder={placeholder}
        readOnly={!canMutate}
      />
    );
  }

  if (field.inputKind === "media") {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-dashed border-border bg-surface-muted p-3 text-sm text-muted">
        <ImagePlus className="shrink-0 text-primary" size={16} />
        <span className="min-w-0 break-words">
          {field.value || "Медиа выбираются и сортируются в библиотеке справа."}
        </span>
      </div>
    );
  }

  if (field.inputKind === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-md border border-border bg-background p-3 text-sm text-muted">
        <input defaultChecked={field.value === "true"} disabled={!canMutate} name="value" type="checkbox" value="true" />
        <span>{field.value || placeholder}</span>
      </label>
    );
  }

  if (field.inputKind === "select") {
    return (
      <select
        className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none"
        defaultValue={field.value}
        disabled={!canMutate}
        name="value"
      >
        <option>{field.value || placeholder}</option>
      </select>
    );
  }

  if (field.inputKind === "readonly" || field.inputKind === "custom") {
    return null;
  }

  return (
    <input
      className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none"
      defaultValue={field.value}
      name="value"
      placeholder={placeholder}
      readOnly={!canMutate}
      type={field.inputKind === "number" ? "text" : "text"}
    />
  );
}

function GuidedFieldCard({
  mutation,
  field,
}: {
  mutation: {
    canMutate: boolean;
    contentId: string;
    itemVersion: number | null;
  };
  field: ContentStudioViewModel["guidedForm"]["fields"][number];
}) {
  const canSubmit =
    mutation.canMutate &&
    !field.locked &&
    field.inputKind !== "custom" &&
    field.inputKind !== "media" &&
    field.inputKind !== "readonly";

  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="break-words text-sm font-medium text-foreground">{field.label}</div>
            {field.required ? <Badge tone="warning">обязательно</Badge> : <Badge>опционально</Badge>}
            {field.lockPolicy ? <Badge tone="info">fact-lock</Badge> : null}
            {field.locked ? <Badge tone="success">зафиксировано</Badge> : null}
          </div>
          <div className="mt-1 text-xs leading-5 text-muted">
            {field.typeLabel} · источник: {field.source}
          </div>
        </div>
        <Badge className="shrink-0" tone={field.statusTone}>{field.status}</Badge>
      </div>
      <p className="text-xs leading-5 text-muted">{field.helper}</p>

      {field.fields.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {field.fields.map((child) => (
            <GuidedFieldCard field={child} key={child.key} mutation={mutation} />
          ))}
        </div>
      ) : null}

      {field.groupItems.length ? (
        <div className="grid gap-3">
          {field.groupItems.map((item) => (
            <div className="grid gap-3 rounded-md border border-border bg-surface-muted p-3" key={item.label}>
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                <GripVertical className="text-muted" size={16} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {item.fields.map((child) => (
                  <GuidedFieldCard field={child} key={child.key} mutation={mutation} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!field.fields.length && !field.groupItems.length && field.inputKind === "media" ? (
        <GuidedFieldControl canMutate={canSubmit} field={field} />
      ) : null}

      {!field.fields.length &&
      !field.groupItems.length &&
      field.inputKind !== "custom" &&
      field.inputKind !== "media" &&
      field.inputKind !== "readonly" ? (
        <GuidedFieldActionForm
          canSubmit={canSubmit}
          contentId={mutation.contentId}
          field={field}
          itemVersion={mutation.itemVersion}
        />
      ) : null}

      {field.newItemFields.length ? (
        <AddRepeatableGroupActionForm
          canMutate={mutation.canMutate}
          contentId={mutation.contentId}
          field={field}
          itemVersion={mutation.itemVersion}
        />
      ) : null}
    </div>
  );
}

function GuidedFormPanel({
  contentId,
  viewModel,
}: {
  contentId: string;
  viewModel: ContentStudioViewModel["guidedForm"];
}) {
  const mutation = {
    canMutate: viewModel.canMutate,
    contentId,
    itemVersion: viewModel.itemVersion,
  };

  return (
    <Card className="grid gap-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ListChecks size={18} className="text-primary" />
            {viewModel.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{viewModel.description}</p>
        </div>
        <Badge tone="info">{viewModel.limits}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {viewModel.generatedFields.map((field) => (
          <Badge key={field} tone="neutral">ИИ позже: {field}</Badge>
        ))}
      </div>
      <div className="grid gap-3">
        {viewModel.fields.map((field) => (
          <GuidedFieldCard field={field} key={field.key} mutation={mutation} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone={viewModel.canMutate ? "success" : "neutral"}>
          {viewModel.canMutate ? "API-сохранение включено" : "Сохранение доступно в API-режиме"}
        </Badge>
        <Badge>Версия: {viewModel.itemVersion ?? "fixture"}</Badge>
      </div>
    </Card>
  );
}

export function ContentIndexShell({ viewModel }: { viewModel: ContentIndexViewModel }) {
  return (
    <div className="grid gap-4">
      <StudioHeader title="Контент" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-ink">Черновики и материалы</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Единица работы здесь — материал, а не пост под одну площадку.
              Факты собираются отдельно от будущей сборки ИИ.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{viewModel.modeLabel}</Badge>
            <Button asChild>
              <Link href="/app/content/new">
                <Plus size={16} />
                Создать материал
              </Link>
            </Button>
          </div>
        </div>

        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {viewModel.items.map((item) => (
            <Card className="grid gap-4" key={item.href}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge>{item.status}</Badge>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {item.project} · {item.rubric}
                  </p>
                </div>
                <Badge tone="success">{item.version}</Badge>
              </div>
              <div className="grid gap-2 text-sm text-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  Автосохранение и конфликт версий проверяются сервером
                </div>
                <div className="flex items-center gap-2">
                  <LockKeyhole size={16} className="text-accent" />
                  Зафиксированные факты будут защищать сборку от подмен
                </div>
              </div>
              <Button asChild variant="secondary">
                <Link href={item.href}>Открыть студию</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function pilotCreateErrorMessage(code?: string): string | null {
  if (!code) {
    return null;
  }
  if (code === "workspace_missing") {
    return "Рабочее пространство не найдено. Войдите заново или откройте кабинет из основного браузера.";
  }
  if (code === "rubric_missing") {
    return "В проекте пока нет рубрики для пилотного черновика.";
  }
  return "Не удалось создать черновик. Обновите страницу, войдите заново и попробуйте ещё раз.";
}

export function NewContentShell({
  pilotError,
  viewModel,
}: {
  pilotError?: string;
  viewModel: NewContentViewModel;
}) {
  const createError = pilotCreateErrorMessage(pilotError);

  return (
    <div className="grid min-w-0 gap-5">
      <StudioHeader label="Мастер материала" title="Новый материал" />
      <section className="mx-auto grid w-full max-w-5xl min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="grid min-w-0 content-start gap-4">
          <LearningHints
            hints={[
              {
                title: "Начинайте с материала",
                body: "Кнопка создаёт рабочий материал по текущему шаблону и переносит вас в мастер сбора.",
              },
              {
                title: "Сбор будет на следующем экране",
                body: "Голос, текст, фото, видео, ИИ-сборка и версии площадок находятся внутри созданного материала.",
              },
            ]}
            storageKey="tmh-learning-pilot-start"
          />
          <MaterialWizardCard flow={viewModel.materialFlow} />
          <Card className="grid gap-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success">рабочий мастер</Badge>
                  <Badge>{viewModel.modeLabel}</Badge>
                </div>
                <h1 className="mt-3 break-words text-2xl font-semibold text-foreground">
                  Создать материал по шаблону
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Нажмите кнопку ниже. После создания откроется рабочий материал:
                  там можно собрать факты, прикрепить медиа, подготовить мастер через ИИ и получить первую версию для площадки.
                </p>
              </div>
              <Smartphone className="shrink-0 text-primary" size={24} />
            </div>
            <div className="rounded-md border border-border bg-surface-muted p-3 text-sm leading-6 text-muted">
              Проект и рубрика: <span className="font-medium text-foreground">{viewModel.contextLabel}</span>
            </div>
            {viewModel.notice ? (
              <div className="rounded-md border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_94%)] p-3 text-sm leading-6 text-muted">
                {viewModel.notice}
              </div>
            ) : null}
            {createError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
                {createError}
              </div>
            ) : null}
            {viewModel.modeLabel === "api" ? (
              <form action={startPilotContentAction}>
                <Button type="submit" className="h-12 w-full text-base">
                  <Plus size={16} />
                  Создать материал и перейти к сбору
                </Button>
              </form>
            ) : null}
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ListChecks size={18} className="text-primary" />
              Что делать после создания
            </div>
            <div className="grid gap-2">
              {viewModel.materialFlow.steps.slice(0, 4).map((step, index) => (
                <div
                  className="grid grid-cols-[32px_1fr] gap-3 rounded-md border border-border p-3 text-sm"
                  key={step.label}
                >
                  <span className="grid size-8 place-items-center rounded bg-surface-muted text-xs text-muted">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-medium text-foreground">{step.label}</span>
                    <span className="mt-1 block leading-5 text-muted">{step.helper}</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <Card className="grid gap-4">
            <div>
              <Badge tone="neutral">не запись</Badge>
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                Здесь запись не идёт
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Эта страница только открывает рабочий черновик. Если вы видели таймер записи на этом экране, это был старый демо-макет, а не реальная активная запись.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted p-4 text-center">
              <Mic className="mx-auto text-primary" size={32} />
              <div className="mt-3 text-2xl font-semibold text-foreground">
                00:00
              </div>
              <div className="mt-1 text-sm text-muted">ожидает создания материала</div>
            </div>
            <div className="grid gap-2 text-sm">
              {viewModel.resumeItems.map(({ label, value }) => (
                <div
                  className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-surface-muted p-3"
                  key={label}
                >
                  <span className="text-muted">{label}</span>
                  <span className="min-w-0 break-words text-right font-medium text-foreground">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary">
              <Download size={16} />
              Установить PWA
            </Button>
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <PanelRight size={18} className="text-primary" />
              Что уже подключено в пилоте
            </div>
            {viewModel.compactPreviews.map(({ note, platform, status }) => (
              <div className="rounded-md border border-border p-3 text-sm" key={platform}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-foreground">{platform}</div>
                  <Badge tone={platform === "Telegram" ? "success" : "warning"}>{status}</Badge>
                </div>
                <div className="mt-1 text-muted">{note}</div>
              </div>
            ))}
          </Card>
        </div>
      </section>
    </div>
  );
}

function InputBlocksCard({ viewModel }: { viewModel: ContentStudioViewModel }) {
  return (
    <Card className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ListChecks size={18} className="text-primary" />
        Входные блоки
      </div>
      {viewModel.inputBlocks.map(({ helper, name, source, status }) => (
        <button
          className="grid gap-2 rounded-md border border-border p-3 text-left text-sm transition hover:bg-surface-muted"
          key={name}
          type="button"
        >
          <span className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-foreground">{name}</span>
            <Badge
              className="shrink-0"
              tone={status === "готово" ? "success" : status === "активно" ? "info" : "warning"}
            >
              {status}
            </Badge>
          </span>
          <span className="text-xs leading-5 text-muted">{helper}</span>
          <span className="text-xs text-muted">Источник: {source}</span>
        </button>
      ))}
      <Button type="button" variant="secondary">
        <Plus size={16} />
        Добавить блюдо
      </Button>
    </Card>
  );
}

function PlatformPreviewsCard({ viewModel }: { viewModel: ContentStudioViewModel }) {
  return (
    <Card className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <PanelRight size={18} className="text-primary" />
        Превью площадок
      </div>
      {viewModel.platformPreviews.map((preview) => (
        <div className="grid gap-3 rounded-md border border-border p-3" key={preview.id}>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-foreground">{preview.platform}</div>
            <Badge tone={preview.status === "готово к проверке" ? "success" : "warning"}>
              {preview.status}
            </Badge>
          </div>
          <div className="grid gap-1 text-xs text-muted">
            <span>{preview.mode}</span>
            <span>{preview.budget}</span>
            <span>{preview.media}</span>
          </div>
          <div className="flex gap-2 rounded-md bg-surface-muted p-2 text-xs leading-5 text-muted">
            <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={14} />
            <span>{preview.warning}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="secondary">
              <MessageSquareText size={14} />
              Редактировать
            </Button>
            <Button size="sm" type="button">
              <Send size={14} />
              На проверку
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}

function FactLocksCard({ viewModel }: { viewModel: ContentStudioViewModel }) {
  return (
    <Card className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <LockKeyhole size={18} className="text-primary" />
        Факт-локи
      </div>
      {viewModel.factLocks.map(({ fact, source, status }) => (
        <div className="rounded-md border border-border p-3 text-sm" key={fact}>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 break-words font-medium text-foreground">{fact}</div>
            <Badge tone={status === "locked" ? "success" : "warning"}>
              {status === "locked" ? "зафиксировано" : "проверка"}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted">{source}</div>
        </div>
      ))}
    </Card>
  );
}

function ChecksCard({ viewModel }: { viewModel: ContentStudioViewModel }) {
  return (
    <Card className="grid gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Clock3 size={18} className="text-primary" />
        Проверки
      </div>
      {viewModel.checks.map(({ label, tone, value }) => (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm" key={label}>
          <span className="text-muted">{label}</span>
          <Badge tone={tone}>{value}</Badge>
        </div>
      ))}
    </Card>
  );
}

function MaterialWizardCard({ flow }: { flow: MaterialCaptureFlowViewModel }) {
  return (
    <Card
      className="grid gap-4 border-primary/30 bg-[color-mix(in_srgb,var(--primary),transparent_96%)]"
      data-testid="material-wizard"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
            <LayoutTemplate className="shrink-0 text-primary" size={18} />
            Мастер материала
          </div>
          <h2 className="mt-3 break-words text-xl font-semibold text-foreground">
            Шаблон: {flow.templateName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Сначала собираем материал по блокам, потом ИИ готовит мастер и отдельные версии для площадок.
          </p>
        </div>
        <Badge className="max-w-full whitespace-normal text-left" tone="success">{flow.primaryOutput}</Badge>
      </div>
      <div className="grid gap-2 text-sm">
        {flow.steps.map((step, index) => (
          <div
            className="grid grid-cols-[32px_1fr] gap-3 rounded-md border border-border bg-background p-3"
            data-testid="material-wizard-step"
            key={step.label}
          >
            <span className="grid size-8 place-items-center rounded bg-primary text-xs font-medium text-primary-foreground">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <span className="break-words font-medium text-foreground">{step.label}</span>
                <Badge tone={step.tone}>{step.status}</Badge>
              </span>
              <span className="mt-1 block leading-5 text-muted">{step.helper}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border bg-background p-3 text-sm leading-6 text-muted">
        Рубрика проекта: <span className="font-medium text-foreground">{flow.sourceLabel}</span>
      </div>
    </Card>
  );
}

function MobileDetails({
  children,
  summary,
}: {
  children: ReactNode;
  summary: string;
}) {
  return (
    <details className="rounded-lg border border-border bg-surface p-4 shadow-panel">
      <summary className="cursor-pointer text-sm font-medium text-foreground">{summary}</summary>
      <div className="mt-4 grid gap-4">{children}</div>
    </details>
  );
}

export function ContentStudioShell({
  contentId,
  viewModel,
}: {
  contentId: string;
  viewModel: ContentStudioViewModel;
}) {
  const { summary } = viewModel;

  return (
    <div className="grid min-w-0 gap-5">
      <StudioHeader label="Этап UI 05" title="Контент-студия" />
      <section className="grid min-w-0 gap-5">
        <Card className="grid gap-4">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <Badge>Материал {viewModel.materialLabel || contentId}</Badge>
                <Badge>{viewModel.modeLabel}</Badge>
              </div>
              <h1 className="mt-3 break-words text-2xl font-semibold text-foreground">
                {summary.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
                <span>{summary.project}</span>
                <span>·</span>
                <span>{summary.rubric}</span>
                <span>·</span>
                <span>{summary.range}</span>
              </div>
            </div>
            <div className="flex max-w-full flex-wrap gap-2">
              <Button type="button" variant="secondary">
                <Save size={16} />
                {summary.autosave}
              </Button>
              <Button type="button">
                <WandSparkles size={16} />
                Собрать мастер-текст
              </Button>
            </div>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-4">
            {[
              ["Статус", summary.status],
              ["Версия", summary.revision],
              ["Факт-локи", summary.lockedFacts],
              ["Публикация", "только после проверки"],
            ].map(([label, value]) => (
              <div className="rounded-md border border-border bg-surface-muted p-3" key={label}>
                <div className="text-xs text-muted">{label}</div>
                <div className="mt-1 font-medium text-foreground">{value}</div>
              </div>
            ))}
          </div>
        </Card>

        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}

        <LearningHints
          className="hidden xl:grid"
          hints={[
            {
              title: "Начинайте с мастера материала",
              body: "Сначала проверьте шаги шаблона, затем соберите факты голосом, текстом или медиа.",
            },
            {
              title: "Форма нужна для фактов",
              body: "Она фиксирует отдельные поля вроде адреса, чека и блюд. Эти данные защищают ИИ-сборку от выдуманных деталей.",
            },
            {
              title: "Правая колонка показывает версии",
              body: "Там видно превью площадок, факт-локи и проверки. Публикация остаётся ручной, после вашей команды.",
            },
          ]}
          storageKey="tmh-learning-content-studio"
        />

        <div className="grid min-w-0 gap-4 xl:hidden">
          <MaterialWizardCard flow={viewModel.materialFlow} />
          <Card>
            <PilotVoiceTelegramPanel
              canMutate={viewModel.guidedForm.canMutate}
              contentId={contentId}
              initialTranscript={viewModel.transcriptReview.text}
              itemVersion={viewModel.guidedForm.itemVersion}
              workspaceId={viewModel.workspaceId}
            />
          </Card>
          <MobileDetails summary="Подробности: факты и поля">
            <InputBlocksCard viewModel={viewModel} />
            <GuidedFormPanel contentId={contentId} viewModel={viewModel.guidedForm} />
          </MobileDetails>
          <MobileDetails summary="Подробности: версии, проверки и факт-локи">
            <PlatformPreviewsCard viewModel={viewModel} />
            <FactLocksCard viewModel={viewModel} />
            <ChecksCard viewModel={viewModel} />
          </MobileDetails>
          <MobileDetails summary="Подробности: мастер-черновик и история">
            <Card className="grid gap-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <MessageSquareText size={18} className="text-primary" />
                    Мастер-черновик
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Черновик собирается из зафиксированных фактов, примеров и правил рубрики.
                  </p>
                </div>
                <Badge tone="info">{viewModel.masterBudget}</Badge>
              </div>
              <article className="grid gap-3 rounded-md border border-border bg-background p-4 text-sm leading-6 text-foreground">
                {viewModel.masterDraftParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </article>
            </Card>
          </MobileDetails>
        </div>

        <div className="hidden min-w-0 gap-4 xl:grid xl:grid-cols-[340px_minmax(0,1fr)_360px]">
          <div className="grid min-w-0 content-start gap-4">
            <MaterialWizardCard flow={viewModel.materialFlow} />
            <InputBlocksCard viewModel={viewModel} />

            <Card>
              <PilotVoiceTelegramPanel
                canMutate={viewModel.guidedForm.canMutate}
                contentId={contentId}
                initialTranscript={viewModel.transcriptReview.text}
                itemVersion={viewModel.guidedForm.itemVersion}
                workspaceId={viewModel.workspaceId}
              />
            </Card>
          </div>

          <div className="grid min-w-0 content-start gap-4">
            <GuidedFormPanel contentId={contentId} viewModel={viewModel.guidedForm} />

            <Card className="grid gap-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <MessageSquareText size={18} className="text-primary" />
                    Мастер-черновик
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Черновик собирается из зафиксированных фактов, примеров и правил рубрики.
                  </p>
                </div>
                <Badge tone="info">{viewModel.masterBudget}</Badge>
              </div>
              <article className="grid gap-3 rounded-md border border-border bg-background p-4 text-sm leading-6 text-foreground">
                {viewModel.masterDraftParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </article>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary">
                  <Sparkles size={16} />
                  Пересобрать выбранный раздел
                </Button>
                <Button type="button">
                  <FileCheck2 size={16} />
                  Принять мастер-текст
                </Button>
              </div>
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Bot size={18} className="text-primary" />
                ИИ-предложения
              </div>
              {viewModel.aiSuggestions.map(({ action, name, text }) => (
                <div className="grid gap-3 rounded-md border border-border p-3" key={name}>
                  <div>
                    <div className="text-sm font-medium text-foreground">{name}</div>
                    <div className="mt-1 text-xs leading-5 text-muted">{text}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" type="button">
                      <CheckCircle2 size={14} />
                      {action === "принять" ? "Принять" : "Принять правку"}
                    </Button>
                    <Button size="sm" type="button" variant="secondary">
                      <MessageSquareText size={14} />
                      Изменить
                    </Button>
                  </div>
                </div>
              ))}
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <History size={18} className="text-primary" />
                История версий
              </div>
              {viewModel.revisionEvents.map(({ event, time, version }) => (
                <div
                  className="grid grid-cols-[48px_1fr] gap-3 rounded-md border border-border p-3 text-sm"
                  key={version}
                >
                  <Badge>{version}</Badge>
                  <div>
                    <div className="font-medium text-foreground">{event}</div>
                    <div className="mt-1 text-xs text-muted">{time}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          <div className="grid min-w-0 content-start gap-4">
            <PlatformPreviewsCard viewModel={viewModel} />
            <FactLocksCard viewModel={viewModel} />
            <ChecksCard viewModel={viewModel} />
          </div>
        </div>
      </section>
    </div>
  );
}

export function MediaLibraryShell({ viewModel }: { viewModel: MediaLibraryViewModel }) {
  return (
    <div className="grid min-w-0 gap-5">
      <StudioHeader label="Этап UI 08" title="Медиа" />
      {viewModel.notice ? (
        <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
          {viewModel.notice}
        </Card>
      ) : null}
      <section className="grid min-w-0 gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="grid content-start gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>Библиотека</Badge>
              <Badge>{viewModel.modeLabel}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">
              Медиа материала
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Загрузка, порядок, обложка, предупреждения совместимости и удаление из материала без удаления файла.
            </p>
          </div>
          <Button type="button">
            <ImagePlus size={16} />
            Выбрать файлы
          </Button>
          <div className="grid gap-2">
            {viewModel.filters.map((filter) => (
              <Button key={filter} size="sm" type="button" variant={filter === "Все" ? "primary" : "secondary"}>
                <Filter size={14} />
                {filter}
              </Button>
            ))}
          </div>
          <div className="rounded-md border border-border bg-surface-muted p-3 text-sm leading-6 text-muted">
            Прогресс загрузки и возобновляемое состояние подключаются позже. Сейчас экран показывает целевое состояние библиотеки.
          </div>
        </Card>

        <Card className="grid content-start gap-3">
          <div>
            <Badge>Порядок и совместимость</Badge>
            <h2 className="mt-3 text-lg font-semibold text-foreground">Файлы материала</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewModel.warnings.map(({ platform, warning }) => (
              <div className="flex gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-muted" key={platform}>
                <AlertTriangle className="shrink-0 text-warning" size={14} />
                <span>{platform}: {warning}</span>
              </div>
            ))}
          </div>
          {viewModel.items.map(({ compatibility, index, role, status, title, type }) => (
            <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[40px_1fr_120px_140px]" key={index}>
              <GripVertical size={18} className="text-muted" />
              <div>
                <div className="text-sm font-medium text-foreground">{index}. {title}</div>
                <div className="mt-1 text-xs text-muted">
                  {type} · {role} · {compatibility}
                </div>
              </div>
              <Badge tone={status === "готово" || status === "расшифровано" ? "success" : "warning"}>{status}</Badge>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" type="button" variant="secondary">
                  <FileCheck2 size={14} />
                  Обложка
                </Button>
                <Button size="sm" type="button" variant="ghost">
                  <RotateCcw size={14} />
                  Убрать
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
