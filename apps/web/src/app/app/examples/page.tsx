import { BookOpenCheck, FileJson, Filter, RefreshCw, Search, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { exampleFilters, exampleLibrary } from "@/features/library-planning/library-planning-fixtures";

export default function ExamplesPage() {
  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary">
              <FileJson size={16} />
              Импорт JSON
            </Button>
            <Button type="button">
              <RefreshCw size={16} />
              Переиндексировать
            </Button>
          </div>
        }
        description="Библиотека примеров используется как стиль и структура, а не как источник фактов."
        eyebrow="Этап UI 08"
        title="Примеры"
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            {exampleFilters.map((filter) => (
              <Button key={filter} size="sm" type="button" variant={filter === "Все" ? "primary" : "secondary"}>
                <Filter size={14} />
                {filter}
              </Button>
            ))}
          </div>
          <label className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <Search size={16} className="shrink-0 text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
              placeholder="Поиск по рубрике, стилю или статусу"
            />
          </label>
          {exampleLibrary.map(([rubric, title, status, score, fragments]) => (
            <div className="rounded-md border border-border p-3" key={title}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-foreground">{title}</div>
                  <div className="mt-1 text-xs text-muted">
                    {rubric} · качество {score} · {fragments}
                  </div>
                </div>
                <Badge tone={status === "одобрено" ? "success" : status === "проверка" ? "warning" : "danger"}>
                  {status}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" type="button" variant="secondary">
                  Одобрить
                </Button>
                <Button size="sm" type="button" variant="ghost">
                  Отклонить
                </Button>
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
