import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  AudioLines,
  Bot,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Filter,
  GripVertical,
  History,
  ImagePlus,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Mic,
  PanelRight,
  Pause,
  Plus,
  Play,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Upload,
  WandSparkles,
  WifiOff,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AddRepeatableGroupActionForm,
  GuidedFieldActionForm,
} from "@/components/phase04/guided-form-actions";
import {
  type ContentIndexViewModel,
  type ContentStudioViewModel,
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

export function NewContentShell({ viewModel }: { viewModel: NewContentViewModel }) {
  return (
    <div className="grid min-w-0 gap-5">
      <StudioHeader label="Этап UI 06" title="Мобильная диктовка" />
      <section className="mx-auto grid w-full max-w-6xl min-w-0 gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <Card className="grid gap-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="info">PWA-запись</Badge>
                  <Badge>Данные: {viewModel.modeLabel}</Badge>
                </div>
                <h1 className="mt-3 break-words text-2xl font-semibold text-foreground">
                  Новый материал голосом
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {viewModel.contextLabel}
                </p>
              </div>
              <Smartphone className="shrink-0 text-primary" size={24} />
            </div>
            {viewModel.notice ? (
              <div className="rounded-md border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_94%)] p-3 text-sm leading-6 text-muted">
                {viewModel.notice}
              </div>
            ) : null}
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
              <ListChecks size={18} className="text-primary" />
              Шаги записи
            </div>
            <div className="grid gap-2">
              {viewModel.captureSteps.map(({ status, step }, index) => (
                <div
                  className="grid grid-cols-[28px_1fr_auto] items-center gap-2 rounded-md border border-border p-2 text-sm"
                  key={step}
                >
                  <span className="grid size-7 place-items-center rounded bg-surface-muted text-xs text-muted">
                    {index + 1}
                  </span>
                  <span className="font-medium text-foreground">{step}</span>
                  <Badge tone={status === "done" ? "success" : status === "active" ? "info" : "neutral"}>
                    {status === "done" ? "готово" : status === "active" ? "сейчас" : "дальше"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="grid gap-4">
            <div>
              <Badge tone="info">{viewModel.activeCaptureBlock.progress}</Badge>
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                {viewModel.activeCaptureBlock.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {viewModel.activeCaptureBlock.prompt}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted p-4 text-center">
              <Mic className="mx-auto text-primary" size={32} />
              <div className="mt-3 text-2xl font-semibold text-foreground">
                {viewModel.activeCaptureBlock.duration}
              </div>
              <div className="mt-1 text-sm text-muted">идёт запись</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button aria-label="Начать запись" size="sm" type="button">
                <Play size={14} />
                Запись
              </Button>
              <Button aria-label="Поставить запись на паузу" size="sm" type="button" variant="secondary">
                <Pause size={14} />
                Пауза
              </Button>
              <Button aria-label="Перезаписать блок" size="sm" type="button" variant="secondary">
                <RotateCcw size={14} />
                Заново
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {viewModel.recordingStates.map(({ label, state }) => (
                <Badge key={state} tone={state === "recording" ? "success" : state === "error" ? "danger" : "neutral"}>
                  {label}
                </Badge>
              ))}
            </div>
            <textarea
              className="min-h-32 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
              defaultValue={viewModel.activeCaptureBlock.transcript}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary">
                Назад
              </Button>
              <Button type="button">
                <CheckCircle2 size={16} />
                Зафиксировать
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <WifiOff size={18} className="text-warning" />
              Локальный черновик
            </div>
            <div className="rounded-md border border-border bg-surface-muted p-3 text-sm">
              <div className="font-medium text-foreground">{viewModel.offlineDraft.status}</div>
              <div className="mt-1 text-muted">{viewModel.offlineDraft.saved}</div>
              <div className="mt-1 text-muted">{viewModel.offlineDraft.queue}</div>
            </div>
            <Button disabled type="button">
              <WandSparkles size={16} />
              Собрать после синхронизации
            </Button>
            <p className="text-xs leading-5 text-muted">
              ИИ и публикация недоступны, пока черновик не синхронизирован.
            </p>
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText size={18} className="text-primary" />
              Проверка перед сборкой
            </div>
            {viewModel.reviewBlocks.map(({ name, status, text }) => (
              <div className="rounded-md border border-border p-3" key={name}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-foreground">{name}</div>
                  <Badge tone={status === "locked" ? "success" : status === "review" ? "warning" : "neutral"}>
                    {status === "locked" ? "зафиксировано" : status === "review" ? "проверка" : "пусто"}
                  </Badge>
                </div>
                <div className="mt-1 text-sm leading-6 text-muted">{text}</div>
              </div>
            ))}
            <Button type="button">
              <Upload size={16} />
              Синхронизировать черновик
            </Button>
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <PanelRight size={18} className="text-primary" />
              Краткие превью
            </div>
            {viewModel.compactPreviews.map(({ note, platform, status }) => (
              <div className="rounded-md border border-border p-3 text-sm" key={platform}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-foreground">{platform}</div>
                  <Badge tone={status === "черновик" ? "info" : "warning"}>{status}</Badge>
                </div>
                <div className="mt-1 text-muted">{note}</div>
              </div>
            ))}
            <Button asChild variant="secondary">
              <Link href="/app/content/demo-review">
                <MessageSquareText size={16} />
                Открыть студию на компьютере
              </Link>
            </Button>
          </Card>
        </div>
      </section>
    </div>
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

        <div className="grid min-w-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
          <div className="grid min-w-0 content-start gap-4">
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

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Mic size={18} className="text-primary" />
                Диктовка и транскрипт
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" type="button">
                  <Play size={14} />
                  Запись
                </Button>
                <Button size="sm" type="button" variant="secondary">
                  <Pause size={14} />
                  Пауза
                </Button>
                <Button size="sm" type="button" variant="secondary">
                  <RotateCcw size={14} />
                  Заново
                </Button>
              </div>
              <div className="rounded-md border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                  <AudioLines size={16} className="text-primary" />
                  {viewModel.transcriptReview.provider}
                  <Badge tone="warning">{viewModel.transcriptReview.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                  <span>{viewModel.transcriptReview.duration}</span>
                  <span>уверенность {viewModel.transcriptReview.confidence}</span>
                </div>
              </div>
              <textarea
                className="min-h-32 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                defaultValue={viewModel.transcriptReview.text}
              />
              <Button type="button">
                <LockKeyhole size={16} />
                Принять и зафиксировать
              </Button>
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
            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <PanelRight size={18} className="text-primary" />
                Превью площадок
              </div>
              {viewModel.platformPreviews.map((preview) => (
                <div className="grid gap-3 rounded-md border border-border p-3" key={preview.platform}>
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
