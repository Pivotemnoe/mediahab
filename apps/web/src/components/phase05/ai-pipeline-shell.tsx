import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BrainCircuit,
  FileJson,
  ListChecks,
  Radar,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type AiPipelineViewModel,
  type ProjectExamplesViewModel,
} from "@/services/ai";

type BadgeTone = "info" | "neutral" | "success" | "warning" | "danger";

function toneForStatus(status: string): BadgeTone {
  if (["готово", "одобрено", "готов к запуску"].includes(status)) {
    return "success";
  }
  if (["ошибка", "отклонено"].includes(status)) {
    return "danger";
  }
  if (["ждёт ключ", "проверка", "нужен материал"].includes(status)) {
    return "warning";
  }
  return "neutral";
}

function AiHeader({ title, label = "Этап 05" }: { title: string; label?: string }) {
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
      description="Примеры, подбор, мастер-текст, проверка качества и журнал запусков ИИ."
      eyebrow={label}
      title={title}
    />
  );
}

export function AiPipelineShell({ viewModel }: { viewModel: AiPipelineViewModel }) {
  return (
    <div className="grid gap-4">
      <AiHeader title="ИИ-пайплайн" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>Техническая сборка</Badge>
              <Badge tone="info">Данные: {viewModel.modeLabel}</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-ink">
              Контролируемый редактор, а не свободный чат
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Сборка использует версию проекта, рубрику, зафиксированные факты и малый набор
              одобренных примеров. Результат сохраняется как версия мастер-текста и журнал запуска ИИ.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button">
              <Sparkles size={16} />
              Собрать мастер-текст
            </Button>
            <Button type="button" variant="secondary">
              <RotateCcw size={16} />
              Повторить этап
            </Button>
          </div>
        </div>

        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_94%)] text-sm leading-6 text-ink">
            {viewModel.notice}
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <div className="text-xs uppercase tracking-wide text-muted">Проект</div>
            <div className="mt-2 text-sm font-semibold text-ink">{viewModel.context.project}</div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-wide text-muted">Материал для запуска</div>
            <div className="mt-2 text-sm font-semibold text-ink">{viewModel.context.content}</div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Этапы генерации</h2>
                <p className="mt-1 text-sm text-muted">
                  Каждый запуск пишет провайдера, модель, расход и результат.
                </p>
              </div>
              <BrainCircuit size={20} className="text-accent" />
            </div>
            {viewModel.steps.map((step) => (
              <div className="grid gap-1 rounded-md border border-line p-3" key={step.title}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-ink">{step.title}</div>
                  <Badge tone={toneForStatus(step.status)}>{step.status}</Badge>
                </div>
                <div className="text-sm leading-6 text-muted">{step.text}</div>
              </div>
            ))}
          </Card>

          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-success" />
              <h2 className="text-lg font-semibold">Защита фактов</h2>
            </div>
            <div className="grid gap-2 text-sm text-muted">
              {viewModel.factGuards.map((guard) => (
                <div className="rounded-md border border-line p-3" key={guard}>
                  {guard}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid content-start gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge>Последние запуски ИИ</Badge>
                <h2 className="mt-3 text-lg font-semibold">Журнал выполнения</h2>
              </div>
              <ListChecks size={18} className="text-accent" />
            </div>
            {viewModel.runs.map((run) => (
              <div
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-line p-3 text-sm"
                key={run.task}
              >
                <span className="font-medium text-ink">{run.task}</span>
                <Badge>{run.provider}</Badge>
                <Badge tone={toneForStatus(run.status)}>{run.status}</Badge>
              </div>
            ))}
          </Card>

          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <Radar size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Подбор примеров</h2>
            </div>
            <div className="grid gap-2">
              {viewModel.examples.map((example) => (
                <div className="rounded-md border border-line p-3" key={example.title}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-ink">{example.title}</div>
                    <Badge tone={toneForStatus(example.status)}>{example.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted">{example.rubric} · качество {example.score}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

export function ExamplesLibraryShell({ viewModel }: { viewModel: ProjectExamplesViewModel }) {
  return (
    <div className="grid gap-4">
      <AiHeader title="Библиотека примеров" />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>Проект</Badge>
              <Badge tone="info">Данные: {viewModel.modeLabel}</Badge>
            </div>
            <h1 className="mt-3 break-all text-3xl font-semibold text-ink">{viewModel.projectLabel}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Примеры проходят импорт, дедупликацию, проверку, одобрение и векторизацию перед попаданием в подбор.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button">
              <FileJson size={16} />
              Импорт JSON
            </Button>
            <Button type="button" variant="secondary">
              <WandSparkles size={16} />
              Разметить
            </Button>
          </div>
        </div>

        {viewModel.notice ? (
          <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_94%)] text-sm leading-6 text-ink">
            {viewModel.notice}
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {viewModel.metrics.map((metric) => (
            <Card key={metric.label}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <BadgeCheck size={16} className="text-success" />
                {metric.label}: {metric.value}
              </div>
              <div className="mt-2 text-sm leading-6 text-muted">
                {metric.note}
              </div>
            </Card>
          ))}
        </div>

        <Card className="grid gap-3">
          {viewModel.examples.map((example) => (
            <div className="grid gap-2 rounded-md border border-line p-3" key={example.title}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-ink">{example.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    {example.rubric} · ручная оценка {example.score} · {example.fragments}
                  </div>
                </div>
                <Badge tone={toneForStatus(example.status)}>{example.status}</Badge>
              </div>
              <div className="text-sm leading-6 text-muted">
                Используется как стиль, а не как источник фактов для нового материала.
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
