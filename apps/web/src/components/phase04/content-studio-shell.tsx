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
  aiSuggestions,
  factLocks,
  inputBlocks,
  masterDraftParagraphs,
  platformPreviews,
  revisionEvents,
  studioSummary,
  transcriptReview,
} from "@/features/content-studio/content-studio-fixtures";
import {
  activeCaptureBlock,
  captureSteps,
  compactPreviews,
  offlineDraft,
  recordingStates,
  resumeItems,
  reviewBlocks,
} from "@/features/mobile-capture/mobile-capture-fixtures";
import {
  mediaFilters,
  mediaLibrary,
  mediaWarnings,
} from "@/features/library-planning/library-planning-fixtures";

const contentItems = [
  {
    title: "Старый город, бизнес-ланч",
    project: "Что поесть? Армавир",
    rubric: "Поесть до 500 рублей",
    status: "сбор фактов",
    version: "v4",
  },
  {
    title: "ПуриПури, сет за 590 ₽",
    project: "Что поесть? Армавир",
    rubric: "Обзор недели",
    status: "готово к сборке",
    version: "v7",
  },
];

const mediaItems = [
  ["01", "Фото фасада", "готово", "обложка"],
  ["02", "Блюдо крупным планом", "готово", "карусель"],
  ["03", "Видео подачи", "проверка", "карусель"],
];

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
      description="Editorial Studio для сбора фактов, диктовки, медиа и фиксации источников."
      eyebrow={label}
      title={title}
    />
  );
}

export function ContentIndexShell() {
  return (
    <div className="grid gap-4">
      <StudioHeader title="Контент" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-ink">Черновики и материалы</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Единица работы здесь — материал, а не пост под одну площадку.
              Факты собираются отдельно от будущей сборки AI.
            </p>
          </div>
          <Button asChild>
            <Link href="/app/content/new">
              <Plus size={16} />
              Создать материал
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {contentItems.map((item) => (
            <Card className="grid gap-4" key={item.title}>
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
                <Link href="/app/content/demo-review">Открыть студию</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export function NewContentShell() {
  return (
    <div className="grid min-w-0 gap-5">
      <StudioHeader label="UI Phase 06" title="Мобильная диктовка" />
      <section className="mx-auto grid w-full max-w-6xl min-w-0 gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-4">
          <Card className="grid gap-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone="info">PWA capture</Badge>
                <h1 className="mt-3 break-words text-2xl font-semibold text-foreground">
                  Новый материал голосом
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Что поесть? Армавир · Обзор недели
                </p>
              </div>
              <Smartphone className="shrink-0 text-primary" size={24} />
            </div>
            <div className="grid gap-2 text-sm">
              {resumeItems.map(([label, value]) => (
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
              {captureSteps.map(([step, status], index) => (
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
              <Badge tone="info">{activeCaptureBlock.progress}</Badge>
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                {activeCaptureBlock.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {activeCaptureBlock.prompt}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface-muted p-4 text-center">
              <Mic className="mx-auto text-primary" size={32} />
              <div className="mt-3 text-2xl font-semibold text-foreground">
                {activeCaptureBlock.duration}
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
              {recordingStates.map(([state, label]) => (
                <Badge key={state} tone={state === "recording" ? "success" : state === "error" ? "danger" : "neutral"}>
                  {label}
                </Badge>
              ))}
            </div>
            <textarea
              className="min-h-32 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
              defaultValue={activeCaptureBlock.transcript}
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
              Offline draft
            </div>
            <div className="rounded-md border border-border bg-surface-muted p-3 text-sm">
              <div className="font-medium text-foreground">{offlineDraft.status}</div>
              <div className="mt-1 text-muted">{offlineDraft.saved}</div>
              <div className="mt-1 text-muted">{offlineDraft.queue}</div>
            </div>
            <Button disabled type="button">
              <WandSparkles size={16} />
              Собрать после синхронизации
            </Button>
            <p className="text-xs leading-5 text-muted">
              AI и публикация недоступны, пока черновик не синхронизирован.
            </p>
          </Card>

          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText size={18} className="text-primary" />
              Review перед сборкой
            </div>
            {reviewBlocks.map(([name, status, text]) => (
              <div className="rounded-md border border-border p-3" key={name}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-foreground">{name}</div>
                  <Badge tone={status === "locked" ? "success" : status === "review" ? "warning" : "neutral"}>
                    {status === "locked" ? "locked" : status === "review" ? "review" : "empty"}
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
              Компактные previews
            </div>
            {compactPreviews.map(([platform, status, note]) => (
              <div className="rounded-md border border-border p-3 text-sm" key={platform}>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-foreground">{platform}</div>
                  <Badge tone={status === "draft" ? "info" : "warning"}>{status}</Badge>
                </div>
                <div className="mt-1 text-muted">{note}</div>
              </div>
            ))}
            <Button asChild variant="secondary">
              <Link href="/app/content/demo-review">
                <MessageSquareText size={16} />
                Открыть desktop studio
              </Link>
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}

export function ContentStudioShell({ contentId }: { contentId: string }) {
  return (
    <div className="grid min-w-0 gap-5">
      <StudioHeader label="UI Phase 05" title="Контент-студия" />
      <section className="grid min-w-0 gap-5">
        <Card className="grid gap-4">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Badge>Материал {contentId}</Badge>
              <h1 className="mt-3 break-words text-2xl font-semibold text-foreground">
                {studioSummary.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
                <span>{studioSummary.project}</span>
                <span>·</span>
                <span>{studioSummary.rubric}</span>
                <span>·</span>
                <span>{studioSummary.range}</span>
              </div>
            </div>
            <div className="flex max-w-full flex-wrap gap-2">
              <Button type="button" variant="secondary">
                <Save size={16} />
                {studioSummary.autosave}
              </Button>
              <Button type="button">
                <WandSparkles size={16} />
                Собрать master
              </Button>
            </div>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-4">
            {[
              ["Статус", studioSummary.status],
              ["Версия", studioSummary.revision],
              ["Факт-локи", studioSummary.lockedFacts],
              ["Публикация", "только после review"],
            ].map(([label, value]) => (
              <div className="rounded-md border border-border bg-surface-muted p-3" key={label}>
                <div className="text-xs text-muted">{label}</div>
                <div className="mt-1 font-medium text-foreground">{value}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)_360px]">
          <div className="grid min-w-0 content-start gap-4">
            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ListChecks size={18} className="text-primary" />
                Входные блоки
              </div>
              {inputBlocks.map(([name, status, helper, source]) => (
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
                  {transcriptReview.provider}
                  <Badge tone="warning">{transcriptReview.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                  <span>{transcriptReview.duration}</span>
                  <span>confidence {transcriptReview.confidence}</span>
                </div>
              </div>
              <textarea
                className="min-h-32 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
                defaultValue={transcriptReview.text}
              />
              <Button type="button">
                <LockKeyhole size={16} />
                Принять и зафиксировать
              </Button>
            </Card>
          </div>

          <div className="grid min-w-0 content-start gap-4">
            <Card className="grid gap-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <MessageSquareText size={18} className="text-primary" />
                    Master draft
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Черновик собирается из зафиксированных фактов, примеров и правил рубрики.
                  </p>
                </div>
                <Badge tone="info">3 860 / 4 096</Badge>
              </div>
              <article className="grid gap-3 rounded-md border border-border bg-background p-4 text-sm leading-6 text-foreground">
                {masterDraftParagraphs.map((paragraph) => (
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
                  Принять master
                </Button>
              </div>
            </Card>

            <Card className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Bot size={18} className="text-primary" />
                AI-предложения
              </div>
              {aiSuggestions.map(([name, text, action]) => (
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
              {revisionEvents.map(([version, event, time]) => (
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
                Preview площадок
              </div>
              {platformPreviews.map((preview) => (
                <div className="grid gap-3 rounded-md border border-border p-3" key={preview.platform}>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{preview.platform}</div>
                    <Badge tone={preview.status === "готово к review" ? "success" : "warning"}>
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
                      В review
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
              {factLocks.map(([fact, status, source]) => (
                <div className="rounded-md border border-border p-3 text-sm" key={fact}>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 break-words font-medium text-foreground">{fact}</div>
                    <Badge tone={status === "locked" ? "success" : "warning"}>
                      {status === "locked" ? "locked" : "review"}
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
              {[
                ["Ошибки", "0", "success"],
                ["Предупреждения", "2", "warning"],
                ["Готовность", "нужен review MAX", "warning"],
              ].map(([label, value, tone]) => (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm" key={label}>
                  <span className="text-muted">{label}</span>
                  <Badge tone={tone === "success" ? "success" : "warning"}>{value}</Badge>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

export function MediaLibraryShell() {
  return (
    <div className="grid min-w-0 gap-5">
      <StudioHeader label="UI Phase 08" title="Медиа" />
      <section className="grid min-w-0 gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="grid content-start gap-4">
          <div>
            <Badge>Библиотека</Badge>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">
              Медиа материала
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Загрузка, порядок, cover, compatibility warnings и удаление из материала без удаления asset.
            </p>
          </div>
          <Button type="button">
            <ImagePlus size={16} />
            Выбрать файлы
          </Button>
          <div className="grid gap-2">
            {mediaFilters.map((filter) => (
              <Button key={filter} size="sm" type="button" variant={filter === "Все" ? "primary" : "secondary"}>
                <Filter size={14} />
                {filter}
              </Button>
            ))}
          </div>
          <div className="rounded-md border border-border bg-surface-muted p-3 text-sm leading-6 text-muted">
            Прогресс загрузки и resumable state подключаются позже. Сейчас экран показывает целевое состояние библиотеки.
          </div>
        </Card>

        <Card className="grid content-start gap-3">
          <div>
            <Badge>Порядок и совместимость</Badge>
            <h2 className="mt-3 text-lg font-semibold text-foreground">Файлы материала</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {mediaWarnings.map(([platform, warning]) => (
              <div className="flex gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-muted" key={platform}>
                <AlertTriangle className="shrink-0 text-warning" size={14} />
                <span>{platform}: {warning}</span>
              </div>
            ))}
          </div>
          {mediaLibrary.map(([index, title, type, status, role, compatibility]) => (
            <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[40px_1fr_120px_140px]" key={index}>
              <GripVertical size={18} className="text-muted" />
              <div>
                <div className="text-sm font-medium text-foreground">{index}. {title}</div>
                <div className="mt-1 text-xs text-muted">
                  {type} · {role} · {compatibility}
                </div>
              </div>
              <Badge tone={status === "готово" ? "success" : "warning"}>{status}</Badge>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" type="button" variant="secondary">
                  <FileCheck2 size={14} />
                  Cover
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
