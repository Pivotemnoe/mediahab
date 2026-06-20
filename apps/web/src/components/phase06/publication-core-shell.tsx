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

const variants = [
  ["Telegram", "32 768", "rich_message", "tg-collage + текст"],
  ["MAX", "4 000", "message", "HTML/Markdown + uploads"],
  ["Instagram", "2 200", "instagram_media", "caption + media package"],
  ["Ручной экспорт", "100 000", "готов", "пакет формируется"],
  ["Generic webhook", "100 000", "готов", "HTTPS + подпись"],
];

const publicationRows = [
  ["published", "Telegram Rich Message", "контракт отправки собран, live evidence pending", "success"],
  ["failed_retryable", "MAX Message", "attachment.not.ready, retry запланирован", "warning"],
  ["manual_required", "Instagram Media", "Meta readiness не подтверждена, пакет готов", "warning"],
  ["manual_required", "Ручной экспорт", "пакет готов, ждёт подтверждения", "warning"],
  ["published", "Generic webhook", "ответ 202", "success"],
  ["failed_retryable", "Generic webhook", "ответ 503", "warning"],
  ["scheduled", "Отложенная публикация", "outbox ждёт время", "neutral"],
  ["cancelled", "Отмена", "pending job закрыт", "danger"],
];

const attempts = [
  ["#1", "telegram_rich_message", "published", "sendRichMessage"],
  ["#1", "max_message", "failed_retryable", "attachment.not.ready"],
  ["#1", "instagram_media", "manual_required", "container-plan"],
  ["#1", "generic_webhook", "failed_retryable", "503"],
  ["#2", "generic_webhook", "published", "202"],
  ["#1", "manual_export", "manual_required", "пакет"],
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
      description="Варианты, approval, Telegram Rich Message, MAX, Instagram, ручной экспорт, generic webhook, попытки и outbox."
      eyebrow="Этап 09"
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
              только одобренный вариант, Telegram собирает rich payload, MAX готовит message
              payload, а Instagram получает media package и Meta container-plan без ложного live-статуса.
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
              <h2 className="text-lg font-semibold">Destinations</h2>
            </div>
            <div className="grid gap-2 text-sm text-muted">
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">Ручной экспорт</div>
                <div className="mt-1">Скачивание пакета не публикует материал. Нужна ручная отметка.</div>
              </div>
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">Generic webhook</div>
                <div className="mt-1">Только HTTPS, локальные и private адреса запрещены.</div>
              </div>
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">Telegram Rich Message</div>
                <div className="mt-1">Основной режим: tg-collage, rich HTML, signed media URL, fallback только после подтверждения.</div>
              </div>
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">MAX Message</div>
                <div className="mt-1">Токен только в Authorization, chat_id задаётся вручную или из webhook events, media count ждёт live spike.</div>
              </div>
              <div className="rounded-md border border-line p-3">
                <div className="font-medium text-ink">Instagram</div>
                <div className="mt-1">Caption до 2 200, carousel 2-10, live feature-flagged до Meta readiness.</div>
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
            {publicationRows.map(([status, destination, note, tone]) => (
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-line p-3" key={`${status}-${destination}`}>
                <div>
                  <div className="text-sm font-medium text-ink">{destination}</div>
                  <div className="mt-1 text-sm text-muted">{note}</div>
                </div>
                <Badge tone={tone as "success" | "warning" | "danger" | "neutral"}>{status}</Badge>
              </div>
            ))}
          </Card>

          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Outbox</h2>
            </div>
            <div className="grid gap-2 text-sm text-muted">
              <div className="flex items-center gap-2 rounded-md border border-line p-3">
                <CheckCircle2 size={16} className="text-success" />
                <span>PostgreSQL хранит intent публикации.</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-line p-3">
                <RotateCcw size={16} className="text-accent" />
                <span>Retry: 5с, 30с, 2м, 10м, 30м, 2ч, 6ч, 12ч.</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-line p-3">
                <TriangleAlert size={16} className="text-warning" />
                <span>Ошибка одной площадки не блокирует остальные.</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="grid content-start gap-3">
            <div className="flex items-center gap-2">
              <History size={18} className="text-accent" />
              <h2 className="text-lg font-semibold">Попытки</h2>
            </div>
            {attempts.map(([number, connector, status, result]) => (
              <div className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md border border-line p-3 text-sm" key={`${number}-${connector}-${status}`}>
                <Badge>{number}</Badge>
                <div>
                  <div className="font-medium text-ink">{connector}</div>
                  <div className="mt-1 text-muted">Результат: {result}</div>
                </div>
                <Badge tone={status === "published" || status === "manual_required" ? "success" : "warning"}>
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
              проверочные предупреждения. Статус остаётся manual_required до подтверждения owner/admin.
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
