import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  History,
  RotateCcw,
  Send,
  ShieldCheck,
  TriangleAlert,
  Webhook,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  operationStates,
  publicationAttempts,
  publicationQueue,
  schedulePosture,
} from "@/features/publication-ops/publication-ops-fixtures";

const variants = [
  ["Telegram", "32 768", "расширенное сообщение", "tg-коллаж + текст"],
  ["MAX", "4 000", "сообщение", "HTML/Markdown + загрузки"],
  ["Instagram", "2 200", "медиа-пакет", "подпись + медиа"],
  ["Ручной экспорт", "100 000", "готов", "пакет формируется"],
  ["Универсальный вебхук", "100 000", "готов", "HTTPS + подпись"],
];

function PublicationHeader() {
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
      description="Очередь публикаций, частичный успех, повторы, отмена, расписание и ручной экспорт."
      eyebrow="Этап UI 07"
      title="Публикации"
    />
  );
}

export function PublicationCoreShell() {
  return (
    <div className="grid gap-4">
      <PublicationHeader />
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>Техническая сборка</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-ink">
              Публикационный контур с Telegram, MAX и Instagram
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Мастер-текст превращается в неизменяемые варианты под площадки. В очередь уходит
              только одобренный вариант, Telegram собирает расширенный пакет, MAX готовит сообщение,
              а Instagram получает медиа-пакет и план контейнера без ложного боевого статуса.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button">
              <FileCheck2 size={16} />
              Одобрить вариант
            </Button>
            <Button type="button" variant="secondary">
              <Send size={16} />
              Поставить в очередь
            </Button>
          </div>
        </div>

        <Card className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TriangleAlert size={18} className="text-warning" />
            Операционные состояния
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {operationStates.map(([state, text]) => (
              <div className="rounded-md border border-border bg-surface-muted p-3" key={state}>
                <div className="text-sm font-medium text-foreground">{state}</div>
                <div className="mt-1 text-xs leading-5 text-muted">{text}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Платформенные варианты</h2>
                <p className="mt-1 text-sm text-muted">Лимиты разные, общего лимита нет.</p>
              </div>
              <ShieldCheck size={20} className="text-success" />
            </div>
            <div className="grid gap-2">
              {variants.map(([platform, limit, status, note]) => (
                <div className="grid gap-2 rounded-md border border-line p-3" key={platform}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-ink">{platform}</div>
                    <Badge tone="success">{status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted">
                    <div>Лимит: {limit}</div>
                    <div>{note}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <Webhook size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Каналы доставки</h2>
            </div>
            <div className="grid gap-2 text-sm text-muted">
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">Ручной экспорт</div>
                <div className="mt-1">Скачивание пакета не публикует материал. Нужна ручная отметка.</div>
              </div>
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">Универсальный вебхук</div>
                <div className="mt-1">Только HTTPS, локальные и приватные адреса запрещены.</div>
              </div>
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">Расширенное сообщение Telegram</div>
                <div className="mt-1">Основной режим: tg-коллаж, расширенный HTML, подписанный URL медиа, резервный режим только после подтверждения.</div>
              </div>
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">Сообщение MAX</div>
                <div className="mt-1">Токен только в Authorization, chat_id задаётся вручную или из событий вебхука, лимит медиа ждёт боевой проверки.</div>
              </div>
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">Instagram</div>
                <div className="mt-1">Подпись до 2 200, карусель 2-10, боевой режим под флагом до готовности Meta.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge>Публикации</Badge>
                <h2 className="mt-3 text-lg font-semibold">Состояния очереди</h2>
              </div>
              <CalendarClock size={18} className="text-accent" />
            </div>
            {publicationQueue.map(([destination, status, note, tone]) => (
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-line p-3" key={`${status}-${destination}`}>
                <div>
                  <div className="text-sm font-medium text-ink">{destination}</div>
                  <div className="mt-1 text-sm text-muted">{note}</div>
                </div>
                <Badge tone={tone as "success" | "warning" | "danger" | "neutral"}>{status}</Badge>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" type="button" variant="secondary">
                <RotateCcw size={14} />
                Повторить ошибки
              </Button>
              <Button size="sm" type="button" variant="secondary">
                <CalendarClock size={14} />
                Запланировать
              </Button>
              <Button size="sm" type="button" variant="ghost">
                <TriangleAlert size={14} />
                Отменить ожидание
              </Button>
            </div>
          </Card>

          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Исходящая очередь</h2>
            </div>
            <div className="grid gap-2 text-sm text-muted">
              <div className="flex items-center gap-2 rounded-md border border-line p-3">
                <CheckCircle2 size={16} className="text-success" />
                <span>PostgreSQL хранит намерение публикации.</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-line p-3">
                <RotateCcw size={16} className="text-accent" />
                <span>Повторы: 5с, 30с, 2м, 10м, 30м, 2ч, 6ч, 12ч.</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-line p-3">
                <TriangleAlert size={16} className="text-warning" />
                <span>Ошибка одной площадки не блокирует остальные.</span>
              </div>
            </div>
            <div className="rounded-md border border-line p-3 text-sm text-muted">
              <div className="font-medium text-ink">Положение в расписании</div>
              <div className="mt-1">
                {schedulePosture.date} {schedulePosture.time} · {schedulePosture.timezone}
              </div>
              <div className="mt-1">Ритм повторов: {schedulePosture.retry}</div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Попытки</h2>
            </div>
            {publicationAttempts.map(([number, connector, status, result, latency]) => (
              <div className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md border border-line p-3 text-sm" key={`${number}-${connector}-${status}`}>
                <Badge>{number}</Badge>
                <div>
                  <div className="font-medium text-ink">{connector}</div>
                  <div className="mt-1 text-muted">Результат: {result} · {latency}</div>
                </div>
                <Badge tone={status === "опубликовано" || status === "нужен ручной экспорт" ? "success" : "warning"}>
                  {status}
                </Badge>
              </div>
            ))}
          </Card>

          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <Download size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Ручной пакет</h2>
            </div>
            <div className="rounded-md border border-line p-3 text-sm leading-6 text-muted">
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
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
