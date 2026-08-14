import Link from "next/link";
import { type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  GripVertical,
  History,
  ImagePlus,
  LayoutTemplate,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  PanelRight,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Upload,
  WandSparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PilotUnavailable } from "@/components/layout/pilot-unavailable";
import { PlatformFeedbackControls } from "@/components/phase12/platform-feedback-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AddRepeatableGroupActionForm,
  GuidedFieldActionForm,
} from "@/components/phase04/guided-form-actions";
import { SimpleVoiceComposer } from "@/components/phase12/simple-voice-composer";
import { CopyTextButton } from "@/components/phase12/copy-text-button";
import { RichTextPreview } from "@/components/phase12/rich-text-editor";
import { normalizeRichText } from "@/lib/rich-text";
import {
  type ContentIndexViewModel,
  type ContentStudioViewModel,
  type MaterialCaptureFlowViewModel,
  type NewContentViewModel,
} from "@/services/content";
import { type MediaLibraryViewModel } from "@/services/library-planning";

function StudioHeader({ title, label = "Публикации" }: { title: string; label?: string }) {
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
      description="Создавайте, проверяйте и продолжайте свои реальные материалы."
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
          <Badge key={field} tone="neutral">Будет добавлено при сборке: {field}</Badge>
        ))}
      </div>
      <div className="grid gap-3">
        {viewModel.fields.map((field) => (
          <GuidedFieldCard field={field} key={field.key} mutation={mutation} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone={viewModel.canMutate ? "success" : "neutral"}>
          {viewModel.canMutate ? "Изменения можно сохранять" : "Только просмотр"}
        </Badge>
        {viewModel.itemVersion ? <Badge>Версия {viewModel.itemVersion}</Badge> : null}
      </div>
    </Card>
  );
}

export function ContentIndexShell({ viewModel }: { viewModel: ContentIndexViewModel }) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-ink">Твои тексты</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Здесь собраны черновики и готовые тексты из всех твоих каналов.
            </p>
          </div>
          {viewModel.items.length ? <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/app/content/new">
                <Plus size={16} />
                Наговорить публикацию
              </Link>
            </Button>
          </div> : null}
        </div>

        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {viewModel.items.length ? viewModel.items.map((item) => (
            <Card className="grid gap-4" key={item.href}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge>{item.status}</Badge>
                  <h2 className="mt-3 text-lg font-semibold text-ink">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {item.project} · {item.rubric}
                  </p>
                </div>
              </div>
              <Button asChild variant="secondary">
                <Link href={item.href}>Открыть текст</Link>
              </Button>
            </Card>
          )) : (
            <Card className="grid justify-items-start gap-4 border-dashed p-6 md:col-span-2">
              <FileText className="text-muted" size={24} />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Здесь пока нет текстов</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Первая публикация появится здесь сразу после сохранения.
                </p>
              </div>
              <Button asChild>
                <Link href="/app/content/new">
                  <Plus size={16} />
                  Наговорить первую публикацию
                </Link>
              </Button>
            </Card>
          )}
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
    return "Не удалось открыть кабинет. Войди заново и попробуй ещё раз.";
  }
  if (code === "rubric_missing") {
    return "Выбранный формат больше недоступен. Выбери другой или начни обычную публикацию.";
  }
  return "Не удалось начать публикацию. Обнови страницу, войди заново и попробуй ещё раз.";
}

export function NewContentShell({
  initialPlatformKey,
  initialProjectId,
  initialRubricId,
  initialStandaloneIdeaToken,
  pilotError,
  viewModel,
}: {
  initialPlatformKey?: string;
  initialProjectId?: string;
  initialRubricId?: string;
  initialStandaloneIdeaToken?: string;
  pilotError?: string;
  viewModel: NewContentViewModel;
}) {
  const createError = pilotCreateErrorMessage(pilotError);

  return (
    <div className="grid min-w-0 gap-4" data-testid="new-content-composer">
      {createError ? (
        <div className="rounded-md border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_92%)] p-3 text-sm leading-6 text-danger">
          {createError}
        </div>
      ) : null}
      <SimpleVoiceComposer
        initialPlatformKey={initialPlatformKey}
        initialProjectId={initialProjectId}
        initialRubricId={initialRubricId}
        initialStandaloneIdeaToken={initialStandaloneIdeaToken}
        viewModel={viewModel}
      />
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
    <Card className="grid gap-3" data-testid="publication-review">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <PanelRight size={18} className="text-primary" />
            Проверка перед публикацией
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            Превью площадок проверяются отдельно. Отправка остаётся ручной.
          </p>
        </div>
        <Badge tone="info">Превью площадок</Badge>
      </div>
      {viewModel.platformPreviews.map((preview) => (
        <div className="grid gap-3 rounded-md border border-border bg-background p-3" key={preview.id}>
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

function MaterialOverviewCard({
  contentId,
  viewModel,
}: {
  contentId: string;
  viewModel: ContentStudioViewModel;
}) {
  const { summary } = viewModel;
  const stats = [
    ["Статус", summary.status],
    ["Версия", summary.revision],
    ["Факт-локи", summary.lockedFacts],
    ["Публикация", "после проверки"],
  ] as const;

  return (
    <Card className="grid gap-4 bg-surface/95" data-testid="material-overview">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap gap-2">
            <Badge>Материал {viewModel.materialLabel || contentId}</Badge>
            <Badge>{viewModel.modeLabel === "api" ? "рабочий материал" : "демо-режим"}</Badge>
          </div>
          <h1 className="mt-3 break-words text-2xl font-semibold leading-tight text-foreground lg:text-3xl">
            {summary.title}
          </h1>
          <div className="mt-2 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-sm leading-6 text-muted">
            <span>{summary.project}</span>
            <span>·</span>
            <span>{summary.rubric}</span>
            <span>·</span>
            <span>{summary.range}</span>
          </div>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap lg:justify-end">
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
      <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <div className="min-w-0 rounded-md border border-border bg-surface-muted px-3 py-2" key={label}>
            <div className="text-xs text-muted">{label}</div>
            <div className="mt-1 break-words font-medium text-foreground">{value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MaterialWizardCard({ flow }: { flow: MaterialCaptureFlowViewModel }) {
  return (
    <Card
      className="grid content-start gap-4 border-primary/25 bg-[color-mix(in_srgb,var(--primary),transparent_97%)]"
      data-testid="material-wizard"
    >
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
            <LayoutTemplate className="shrink-0 text-primary" size={18} />
            Мастер материала
          </div>
          <h2 className="mt-2 break-words text-xl font-semibold leading-tight text-foreground">
            Шаблон: {flow.templateName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Сначала собираем материал по блокам, затем редактор готовит цельный текст и отдельные версии для площадок.
          </p>
        </div>
        <Badge className="max-w-full whitespace-normal text-left" tone="success">{flow.primaryOutput}</Badge>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-1">
        {flow.steps.map((step, index) => (
          <div
            className="grid min-w-0 grid-cols-[28px_1fr_auto] items-start gap-3 rounded-md border border-border bg-background px-3 py-2"
            data-testid="material-wizard-step"
            key={step.label}
          >
            <span className="grid size-7 place-items-center rounded bg-primary text-xs font-medium text-primary-foreground">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block break-words font-medium text-foreground">{step.label}</span>
              <span className="mt-1 hidden leading-5 text-muted sm:block">{step.helper}</span>
            </span>
            <Badge className="max-w-[7rem] whitespace-normal text-left" tone={step.tone}>{step.status}</Badge>
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
  if (!viewModel.available) {
    return (
      <Card className="mx-auto grid w-full max-w-2xl justify-items-start gap-4 border-dashed p-6 sm:p-8">
        <Badge tone="warning">Текст недоступен</Badge>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Не удалось открыть текст</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{viewModel.notice}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/app/content">
            <ArrowLeft size={16} />
            Вернуться ко всем текстам
          </Link>
        </Button>
      </Card>
    );
  }

  if (viewModel.modeLabel === "api") {
    const sourceText =
      viewModel.transcriptReview.text || viewModel.masterDraftParagraphs.join("\n\n");
    const newContentHref = viewModel.projectId
      ? `/app/content/new?project=${encodeURIComponent(viewModel.projectId)}`
      : "/app/content/new";

    return (
      <div className="grid min-w-0 gap-5" data-testid="content-studio-real">
        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
            {viewModel.notice}
          </Card>
        ) : null}

        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{viewModel.summary.project}</Badge>
              <Badge>{viewModel.summary.rubric}</Badge>
              <Badge tone="info">{viewModel.summary.status}</Badge>
            </div>
            <h1 className="mt-3 break-words text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              {viewModel.summary.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {viewModel.summary.autosave}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/app/content">
                <ArrowLeft size={16} />
                Все тексты
              </Link>
            </Button>
            <Button asChild>
              <Link href={newContentHref}>
                <Plus size={16} />
                Новая публикация
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="min-w-0">
            <Card className="grid min-w-0 gap-3">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FileText size={20} />
                  Твоя исходная мысль
                </div>
                {sourceText ? (
                  <Button asChild size="sm" variant="secondary">
                    <Link
                      data-testid="edit-source-and-rebuild"
                      href={`/app/content/new?edit=${encodeURIComponent(contentId)}`}
                    >
                      <Pencil size={15} />
                      Исправить мысль и подготовить заново
                    </Link>
                  </Button>
                ) : null}
              </div>
              {sourceText ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                  {sourceText}
                </p>
              ) : (
                <p className="text-sm leading-6 text-muted">Исходная мысль для этой публикации не сохранилась.</p>
              )}
            </Card>
          </div>

          <Card className="grid min-w-0 content-start gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <CheckCircle2 size={20} />
                Тексты для площадок
              </div>
              <p className="mt-1 text-sm leading-6 text-muted">
                У каждой площадки свой текст. Правка одного не изменит остальные.
              </p>
            </div>

            {viewModel.platformPreviews.length ? (
              <div className="grid min-w-0 gap-3">
                {viewModel.platformPreviews.map((preview) => (
                  <article
                    className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-4"
                    data-testid="saved-platform-version"
                    key={preview.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">{preview.platform}</h2>
                        <p className="mt-1 text-xs text-muted">{preview.budget}</p>
                      </div>
                      <Badge tone={preview.status.includes("готов") ? "success" : "warning"}>
                        {preview.status}
                      </Badge>
                    </div>
                    {preview.text ? (
                      <RichTextPreview value={normalizeRichText(preview.richText, preview.text)} />
                    ) : (
                      <p className="text-sm leading-6 text-muted">Текст для этой площадки пока не готов.</p>
                    )}
                    {preview.warning ? (
                      <div className="flex items-start gap-2 rounded-md bg-surface-muted p-3 text-sm leading-6 text-muted">
                        <AlertTriangle className="mt-0.5 shrink-0" size={16} />
                        <span>{preview.warning}</span>
                      </div>
                    ) : null}
                    {preview.text ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <CopyTextButton
                            label={preview.platform}
                            richText={normalizeRichText(preview.richText, preview.text)}
                            text={preview.text}
                          />
                          <Button asChild variant="secondary">
                            <Link
                              data-testid="refine-saved-platform-version"
                              href={`/app/content/new?edit=${encodeURIComponent(contentId)}&platform=${encodeURIComponent(preview.platformKey)}#platform-results`}
                            >
                              <WandSparkles size={16} />
                              Доработать
                            </Link>
                          </Button>
                        </div>
                        <PlatformFeedbackControls platformLabel={preview.platform} variantId={preview.id} />
                      </>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-5 text-sm leading-6 text-muted">
                Текстов для площадок пока нет. Вернись к исходной мысли и подготовь их.
              </div>
            )}

            <div className="rounded-lg bg-surface-muted p-4 text-sm leading-6 text-muted">
              Перед публикацией проверь каждый текст. Без твоего подтверждения ничего не отправится.
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PilotUnavailable
      backHref="/app/content"
      backLabel="К текстам"
      description="Этот экран сейчас недоступен. Открой сохранённый текст или начни новую публикацию."
      title="Не удалось открыть публикацию"
    />
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
