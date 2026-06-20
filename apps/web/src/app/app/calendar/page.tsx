import { CalendarClock, Clock3, RotateCcw, Send, XCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calendarDays, calendarQueue } from "@/features/library-planning/library-planning-fixtures";

export default function CalendarPage() {
  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        actions={
          <Button type="button">
            <CalendarClock size={16} />
            Запланировать
          </Button>
        }
        description="Календарь публикаций: workspace timezone, UTC-хранение, reschedule, cancel и durable outbox."
        eyebrow="UI Phase 08"
        title="Календарь"
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            {calendarDays.map(([day, status, note]) => (
              <div className="rounded-md border border-border bg-surface-muted p-3" key={day}>
                <div className="text-sm font-medium text-foreground">{day}</div>
                <Badge className="mt-2" tone={status === "empty" ? "neutral" : status === "warning" ? "warning" : "success"}>
                  {status}
                </Badge>
                <div className="mt-2 text-xs leading-5 text-muted">{note}</div>
              </div>
            ))}
          </div>
          {calendarQueue.map(([date, title, status, note]) => (
            <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[140px_1fr_auto]" key={title}>
              <div className="flex items-center gap-2 text-sm text-muted">
                <CalendarClock size={16} />
                {date}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{title}</div>
                <div className="mt-1 text-xs text-muted">{note}</div>
              </div>
              <Badge tone={status === "scheduled" || status === "rescheduled" ? "success" : "warning"}>{status}</Badge>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="secondary">
              <RotateCcw size={14} />
              Reschedule
            </Button>
            <Button size="sm" type="button" variant="ghost">
              <XCircle size={14} />
              Cancel pending
            </Button>
          </div>
        </Card>
        <Card className="grid content-start gap-3">
          <Clock3 size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Outbox и расписание</h2>
          <p className="text-sm leading-6 text-muted">
            Наивное локальное время нормализуется по timezone рабочего пространства и хранится в UTC.
            Перенос обновляет pending outbox event, отмена закрывает его без публикации.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Send size={16} />
            Повторный запуск воркера не создаёт дубли external posts.
          </div>
        </Card>
      </div>
    </div>
  );
}
