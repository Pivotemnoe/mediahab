import { CalendarClock, Clock3, Send } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const rows = [
  ["21 июня, 12:00", "Старый город: бизнес-ланч", "Europe/Moscow -> 09:00 UTC", "запланировано"],
  ["22 июня, 15:30", "ПуриПури: продолжение обзора", "reschedule обновляет outbox", "запланировано"],
  ["Отменено", "BBQ: хаш и шашлык", "pending job закрыт", "отменено"],
] as const;

export default function CalendarPage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        description="Технический календарь публикаций: UTC-хранение, workspace timezone, reschedule, cancel и durable outbox."
        eyebrow="Этап 10"
        title="Календарь"
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="grid gap-3">
          {rows.map(([date, title, note, status]) => (
            <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[140px_1fr_auto]" key={title}>
              <div className="flex items-center gap-2 text-sm text-muted">
                <CalendarClock size={16} />
                {date}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{title}</div>
                <div className="mt-1 text-xs text-muted">{note}</div>
              </div>
              <Badge tone={status === "запланировано" ? "success" : "danger"}>{status}</Badge>
            </div>
          ))}
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
