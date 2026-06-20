import { CalendarClock, Clock3, Send } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const rows = [
  ["Сегодня", "Старый город: бизнес-ланч", "черновик"],
  ["Завтра", "ПуриПури: продолжение обзора", "approval"],
  ["Пятница", "BBQ: хаш и шашлык", "запланировано"],
] as const;

export default function CalendarPage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        description="Технический календарь публикаций. Полная сетка расписания будет расширяться в публикационных фазах."
        eyebrow="Планирование"
        title="Календарь"
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="grid gap-3">
          {rows.map(([date, title, status]) => (
            <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[120px_1fr_auto]" key={title}>
              <div className="flex items-center gap-2 text-sm text-muted">
                <CalendarClock size={16} />
                {date}
              </div>
              <div className="text-sm font-medium text-foreground">{title}</div>
              <Badge tone={status === "запланировано" ? "success" : "warning"}>{status}</Badge>
            </div>
          ))}
        </Card>
        <Card className="grid content-start gap-3">
          <Clock3 size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Outbox и расписание</h2>
          <p className="text-sm leading-6 text-muted">
            Планировщик должен уважать approval, idempotency key и retry-политику публикаций.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted">
            <Send size={16} />
            Ручной экспорт не считается публикацией без подтверждения.
          </div>
        </Card>
      </div>
    </div>
  );
}
