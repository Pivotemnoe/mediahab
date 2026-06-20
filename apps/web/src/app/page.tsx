import Link from "next/link";
import { ArrowRight, Database, FileText, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const checks = [
  {
    icon: Database,
    title: "Проекты и рубрики",
    text: "Конфигурация будет храниться в базе и версионироваться.",
  },
  {
    icon: FileText,
    title: "Контент и варианты",
    text: "Master-текст отделён от Telegram, MAX и Instagram вариантов.",
  },
  {
    icon: ShieldCheck,
    title: "Публикация",
    text: "Перед публикацией нужен review, validation и явное подтверждение.",
  },
];

export default function MarketingIndex() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <div className="text-sm font-semibold">Temichev Media Hub</div>
            <div className="text-xs text-muted">Phase 01 technical shell</div>
          </div>
          <Button asChild variant="secondary">
            <Link href="/app">
              Кабинет
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center gap-5">
          <Badge tone="success" className="w-fit">
            Foundation
          </Badge>
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-ink sm:text-5xl">
              Технический каркас для сборки обзоров и публикаций
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Сейчас это спокойная рабочая оболочка: маршруты, базовая
              дизайн-система, API health checks, worker skeleton и OpenAPI
              pipeline. Продуктовая логика начнётся после foundation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/app">Открыть рабочий экран</Link>
            </Button>
            <Button asChild variant="secondary">
              <a href="http://localhost:8100/docs">API docs</a>
            </Button>
          </div>
        </div>

        <Card className="grid gap-3">
          <div className="text-sm font-semibold">Foundation scope</div>
          {checks.map((item) => (
            <div
              className="grid grid-cols-[40px_1fr] gap-3 rounded-md border border-line p-3"
              key={item.title}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-accent">
                <item.icon size={20} />
              </div>
              <div>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="mt-1 text-sm leading-6 text-muted">
                  {item.text}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </main>
  );
}
