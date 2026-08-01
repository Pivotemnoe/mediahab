import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  History,
  RotateCcw,
  Send,
  ShieldCheck,
  TriangleAlert,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type PublicationOpsViewModel } from "@/services/publications";

function platformTone(status: string): "info" | "neutral" | "success" | "warning" {
  const normalized = status.toLowerCase();
  if (normalized.includes("готов") || normalized.includes("сообщение") || normalized.includes("пакет")) {
    return "success";
  }
  if (normalized.includes("блок") || normalized.includes("ошиб")) {
    return "warning";
  }
  return "info";
}

function platformAction(platform: string): string {
  if (platform === "Instagram" || platform === "Ручной экспорт") {
    return "Подготовить пакет";
  }
  if (platform === "Универсальный вебхук") {
    return "Проверить адрес";
  }
  return "Проверить вариант";
}

export function PublicationCoreShell({ viewModel }: { viewModel: PublicationOpsViewModel }) {
  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Публикация</Badge>
            <Badge>ручное подтверждение</Badge>
          </div>
          <h1 className="mt-3 break-words text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            Проверка и отправка материалов
          </h1>
          <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted">
            Сначала проверьте версии для Telegram, MAX и Instagram. Каждая площадка живёт отдельно,
            а отправка начинается только после явного подтверждения.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/app">
            <ArrowLeft size={16} />
            Главная
          </Link>
        </Button>
      </div>

      {viewModel.notice ? (
        <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
          {viewModel.notice}
        </Card>
      ) : null}

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]" data-testid="publication-review">
        <Card className="grid min-w-0 gap-5 border-transparent p-5 shadow-popover sm:p-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="text-success" size={18} />
                Версии площадок
              </div>
              <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted">
                Лимиты Telegram, MAX и Instagram не смешиваются. Проверьте каждую карточку отдельно,
                затем подтвердите публикацию вручную.
              </p>
            </div>
            <Badge tone="info">до отправки</Badge>
          </div>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            {viewModel.variants.map(({ limit, note, platform, status }) => (
              <div className="grid min-w-0 gap-3 rounded-lg border border-border bg-background p-4" key={platform}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-base font-semibold text-foreground">{platform}</div>
                    <div className="mt-1 break-words text-sm leading-6 text-muted">{note}</div>
                  </div>
                  <Badge className="shrink-0" tone={platformTone(status)}>
                    {status}
                  </Badge>
                </div>
                <div className="grid gap-2 rounded-md bg-surface-muted p-3 text-sm text-muted sm:grid-cols-[1fr_auto]">
                  <span className="break-words">Лимит: {limit}</span>
                  <span className="font-medium text-foreground">{platformAction(platform)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="grid min-w-0 content-start gap-4 p-5 shadow-panel">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileCheck2 className="text-primary" size={18} />
            Подтверждение
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="text-xl font-semibold text-foreground">Публикация не уйдёт сама</div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Перед отправкой владелец или редактор открывает версии, проверяет площадки и нажимает подтверждение.
            </p>
          </div>
          <div className="grid gap-2">
            {viewModel.queue.slice(0, 3).map(({ destination, note, status, tone }) => (
              <div className="grid min-w-0 gap-2 rounded-md border border-border bg-surface-muted p-3" key={`${destination}-${status}`}>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="break-words text-sm font-semibold text-foreground">{destination}</div>
                  <Badge className="shrink-0" tone={tone}>{status}</Badge>
                </div>
                <div className="break-words text-xs leading-5 text-muted">{note}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Button type="button">
              <Eye size={16} />
              Проверить версии
            </Button>
            <Button type="button" variant="secondary">
              <Send size={16} />
              Подготовить отправку
            </Button>
          </div>
          <div className="rounded-md border border-success bg-[color-mix(in_srgb,var(--success),transparent_92%)] p-3 text-sm leading-6 text-muted">
            Даже после подготовки остаётся отдельное ручное подтверждение перед публикацией.
          </div>
        </Card>
      </section>

      <details className="group rounded-lg border border-border bg-surface p-4 shadow-panel" data-testid="publication-advanced">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
          <span className="flex items-center gap-2">
            <TriangleAlert className="text-warning" size={18} />
            Расширенный режим: доставка, повторы и диагностика
          </span>
          <span className="text-xs text-muted group-open:hidden">Показать</span>
          <span className="hidden text-xs text-muted group-open:inline">Скрыть</span>
        </summary>

        <div className="mt-4 grid min-w-0 gap-4">
          <Card className="grid min-w-0 gap-3 bg-background shadow-none">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TriangleAlert size={18} className="text-warning" />
              Операционные состояния
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {viewModel.operationStates.map(({ state, text }) => (
                <div className="rounded-md border border-border bg-surface p-3" key={state}>
                  <div className="break-words text-sm font-semibold text-foreground">{state}</div>
                  <div className="mt-1 break-words text-xs leading-5 text-muted">{text}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="grid min-w-0 gap-3 bg-background shadow-none">
              <div className="flex items-center gap-2">
                <Webhook size={18} className="text-primary" />
                <h2 className="text-lg font-semibold">Каналы доставки</h2>
              </div>
              <div className="grid gap-2 text-sm text-muted">
                {viewModel.destinations.map((destination) => (
                  <div className="rounded-md border border-border bg-surface p-3" key={destination.name}>
                    <div className="break-words font-semibold text-foreground">{destination.title}</div>
                    <div className="mt-1 break-words">{destination.text}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="grid min-w-0 content-start gap-3 bg-background shadow-none">
              <div className="flex items-center gap-2">
                <Clock3 size={18} className="text-primary" />
                <h2 className="text-lg font-semibold">Исходящая очередь</h2>
              </div>
              <div className="grid gap-2 text-sm text-muted">
                <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                  <span>PostgreSQL хранит намерение публикации.</span>
                </div>
                <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-3">
                  <RotateCcw size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>Повторы: 5с, 30с, 2м, 10м, 30м, 2ч, 6ч, 12ч.</span>
                </div>
                <div className="flex items-start gap-2 rounded-md border border-border bg-surface p-3">
                  <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" />
                  <span>Ошибка одной площадки не блокирует остальные.</span>
                </div>
              </div>
              <div className="rounded-md border border-border bg-surface p-3 text-sm text-muted">
                <div className="font-semibold text-foreground">Положение в расписании</div>
                <div className="mt-1">
                  {viewModel.schedulePosture.date} {viewModel.schedulePosture.time} · {viewModel.schedulePosture.timezone}
                </div>
                <div className="mt-1">Ритм повторов: {viewModel.schedulePosture.retry}</div>
              </div>
            </Card>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <Card className="grid min-w-0 content-start gap-3 bg-background shadow-none">
              <div className="flex items-center gap-2">
                <History size={18} className="text-primary" />
                <h2 className="text-lg font-semibold">Попытки</h2>
              </div>
              {viewModel.attempts.map(({ connector, latency, number, result, status }) => (
                <div className="grid min-w-0 gap-3 rounded-md border border-border bg-surface p-3 text-sm sm:grid-cols-[56px_1fr_auto]" key={`${number}-${connector}-${status}`}>
                  <Badge>{number}</Badge>
                  <div className="min-w-0">
                    <div className="break-words font-semibold text-foreground">{connector}</div>
                    <div className="mt-1 break-words text-muted">Результат: {result} · {latency}</div>
                  </div>
                  <Badge tone={status === "опубликовано" || status === "нужен ручной экспорт" ? "success" : "warning"}>
                    {status}
                  </Badge>
                </div>
              ))}
            </Card>

            <Card className="grid min-w-0 content-start gap-3 bg-background shadow-none">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-primary" />
                <h2 className="text-lg font-semibold">Ручной пакет</h2>
              </div>
              <div className="rounded-md border border-border bg-surface p-3 text-sm leading-6 text-muted">
                В пакете сохраняются текст варианта, порядок медиа, destination, idempotency key и
                проверочные предупреждения. Статус остаётся «нужен ручной экспорт» до подтверждения владельца или администратора.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary">
                  <Download size={16} />
                  Скачать пакет
                </Button>
                <Button type="button" variant="ghost">
                  <RotateCcw size={16} />
                  Повторить
                </Button>
                <Button type="button" variant="secondary">
                  <CalendarClock size={16} />
                  Запланировать
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </details>
    </div>
  );
}
