import { BookOpenCheck, FileJson, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const examples = [
  ["Обзор недели", "ПуриПури: интерьер спорит с кухней", "одобрено"],
  ["Поесть до 500 рублей", "Старый город: бизнес-ланч без режима выживания", "одобрено"],
  ["Фаст-обзор", "440 грамм за 250 ₽: вес есть, радости мало", "проверка"],
] as const;

export default function ExamplesPage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        actions={
          <Button type="button" variant="secondary">
            <FileJson size={16} />
            Импорт JSON
          </Button>
        }
        description="Библиотека примеров используется как стиль и структура, а не как источник фактов."
        eyebrow="ИИ"
        title="Примеры"
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="grid gap-3">
          {examples.map(([rubric, title, status]) => (
            <div className="rounded-md border border-border p-3" key={title}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-foreground">{title}</div>
                  <div className="mt-1 text-xs text-muted">{rubric}</div>
                </div>
                <Badge tone={status === "одобрено" ? "success" : "warning"}>{status}</Badge>
              </div>
            </div>
          ))}
        </Card>
        <Card className="grid content-start gap-3">
          <BookOpenCheck size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Правила подбора</h2>
          <p className="text-sm leading-6 text-muted">
            На генерацию должен уходить малый набор релевантных одобренных примеров.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted">
            <ShieldCheck size={16} className="text-success" />
            Примеры не могут менять заблокированные факты.
          </div>
        </Card>
      </div>
    </div>
  );
}
