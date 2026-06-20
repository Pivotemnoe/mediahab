import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileEdit,
  RadioTower,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const pipeline = [
  ["Источник", "Диктовка или текстовые блоки", "pending"],
  ["Master", "AI assembly после fact lock", "planned"],
  ["Варианты", "Telegram, MAX, Instagram", "planned"],
  ["Публикация", "Outbox + worker + connector", "blocked"],
];

const integrations = [
  ["Telegram", "Rich Message spike есть, live pending", "warning"],
  ["MAX", "4 000 chars enforced, mixed media pending", "warning"],
  ["Instagram", "manual_required до Meta readiness", "danger"],
];

export default function CabinetShell() {
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <div className="text-sm font-semibold">Что поесть? Армавир</div>
            <div className="text-xs text-muted">Технический кабинет</div>
          </div>
          <Button variant="secondary">
            <FileEdit size={16} />
            Новый материал
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-line bg-white p-3 shadow-panel">
          {["Дашборд", "Проекты", "Контент", "Публикации", "Медиа", "Настройки"].map(
            (item, index) => (
              <button
                className={`flex h-10 w-full items-center rounded-md px-3 text-left text-sm ${
                  index === 0
                    ? "bg-surface font-medium text-ink"
                    : "text-muted hover:bg-surface"
                }`}
                key={item}
              >
                {item}
              </button>
            ),
          )}
        </aside>

        <section className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Черновики</span>
                <FileEdit size={18} className="text-accent" />
              </div>
              <div className="mt-3 text-3xl font-semibold">0</div>
              <div className="mt-1 text-sm text-muted">Product data in Phase 03+</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Запланировано</span>
                <CalendarClock size={18} className="text-accent" />
              </div>
              <div className="mt-3 text-3xl font-semibold">0</div>
              <div className="mt-1 text-sm text-muted">Scheduler in Phase 06+</div>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Интеграции</span>
                <RadioTower size={18} className="text-accent" />
              </div>
              <div className="mt-3 text-3xl font-semibold">3</div>
              <div className="mt-1 text-sm text-muted">All pending live credentials</div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Контент-пайплайн</h2>
                  <p className="text-sm text-muted">Статический technical preview</p>
                </div>
                <Badge>Phase 01</Badge>
              </div>
              <div className="grid gap-3">
                {pipeline.map(([title, text, status]) => (
                  <div
                    className="flex items-center gap-3 rounded-md border border-line p-3"
                    key={title}
                  >
                    {status === "blocked" ? (
                      <AlertTriangle size={18} className="text-warning" />
                    ) : (
                      <CheckCircle2 size={18} className="text-success" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{title}</div>
                      <div className="text-sm text-muted">{text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">Интеграции</h2>
              <div className="mt-4 grid gap-3">
                {integrations.map(([name, text, tone]) => (
                  <div className="rounded-md border border-line p-3" key={name}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{name}</div>
                      <Badge tone={tone as "warning" | "danger"}>pending</Badge>
                    </div>
                    <div className="mt-1 text-sm leading-6 text-muted">{text}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
