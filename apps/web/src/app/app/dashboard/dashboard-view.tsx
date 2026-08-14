import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FolderKanban,
  Mic,
  NotebookPen,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDashboardViewModel } from "@/services/dashboard";

export default async function DashboardView() {
  const dashboard = await getDashboardViewModel();
  const hasProjects = dashboard.projects.length > 0;

  function formatCount(count: number): string {
    const lastTwo = count % 100;
    const last = count % 10;
    if (lastTwo >= 11 && lastTwo <= 19) return `${count} форматов`;
    if (last === 1) return `${count} формат`;
    if (last >= 2 && last <= 4) return `${count} формата`;
    return `${count} форматов`;
  }

  return (
    <div className="grid min-w-0 gap-5">
      <section className="grid min-w-0 gap-5 rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-panel sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h1 className="font-editorial mt-4 max-w-3xl text-4xl leading-tight text-white sm:text-5xl">
            О чём хочешь рассказать сегодня?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-sidebar-foreground/78 sm:text-base">
            Расскажи всё своими словами — целиком или по частям. «Наговори» учтёт стиль канала; формат выбирай только тогда, когда он действительно нужен.
          </p>
        </div>
        {hasProjects ? (
          <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/app/content/new">
              <Mic size={16} />
              Наговорить публикацию
            </Link>
          </Button>
          </div>
        ) : null}
      </section>

      {dashboard.notice ? (
        <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
          {dashboard.notice}
        </Card>
      ) : null}

      <section className="grid min-w-0 gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Блокнот</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Сохраняй мысли на ходу. Канал и площадку можно выбрать позже.</p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/app/notebook">Записать мысль</Link>
          </Button>
        </div>
        {dashboard.recentNotes.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {dashboard.recentNotes.map((note, index) => (
              <Link className="rounded-lg border border-border bg-surface p-4 shadow-panel transition hover:bg-surface-muted" href={note.href} key={`${note.updatedAt}-${index}`}>
                <p className="line-clamp-3 text-sm leading-6 text-foreground">{note.body || "Пустая заметка"}</p>
                <span className="mt-2 block text-xs text-muted">Продолжить заметку</span>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="grid justify-items-start gap-3 border-dashed p-5">
            <NotebookPen className="text-muted" size={22} />
            <p className="text-sm leading-6 text-muted">Сохрани мысль сейчас — канал можно выбрать позже.</p>
          </Card>
        )}
      </section>

      <section className="grid min-w-0 gap-4">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Мои каналы</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Для каждого канала можно сохранить свой стиль, примеры и повторяющиеся форматы.
            </p>
          </div>
          {hasProjects ? (
            <Button asChild size="sm" variant="secondary">
              <Link href="/app/projects">Все каналы</Link>
            </Button>
          ) : null}
        </div>

        {hasProjects ? (
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            {dashboard.projects.map((project) => (
              <Card className="grid min-w-0 gap-4 p-5" key={project.href}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <FolderKanban className="shrink-0 text-primary" size={20} />
                      <span className="truncate">{project.name}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{project.note}</p>
                  </div>
                  {project.rubricCount ? <Badge>{formatCount(project.rubricCount)}</Badge> : null}
                </div>
                <div>
                  <Button asChild variant="secondary">
                    <Link href={project.href}>
                      Открыть канал
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="grid justify-items-start gap-4 border-dashed p-6 sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--primary),transparent_88%)] text-primary">
              <FolderKanban size={24} />
            </span>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Создай первый канал</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Назови канал. Примеры стиля можно добавить сейчас или позже — после этого уже можно наговаривать первый текст.
              </p>
            </div>
            <Button asChild>
              <Link href="/app/projects/new">
                <Plus size={16} />
                Создать канал
              </Link>
            </Button>
          </Card>
        )}
      </section>

      <section className="grid min-w-0 gap-4">
        <Card className="grid min-w-0 gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Недавние тексты</h2>
              <p className="mt-1 text-sm text-muted">Здесь появятся тексты, над которыми ты недавно работал.</p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/app/content">Все тексты</Link>
            </Button>
          </div>
          {dashboard.recentDrafts.length ? (
            <div className="grid gap-2">
              {dashboard.recentDrafts.map((item) => (
                <Link className="grid min-w-0 gap-2 rounded-lg border border-border bg-background p-4 transition hover:bg-surface-muted sm:grid-cols-[minmax(0,1fr)_auto]" href={item.href} key={item.href}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                    <div className="mt-1 truncate text-xs text-muted">{item.project} · {item.rubric}</div>
                  </div>
                  <StatusBadge status="neutral">{item.status}</StatusBadge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-border p-5">
              <FileText className="text-muted" size={22} />
              <div className="text-sm font-semibold text-foreground">Здесь пока нет текстов</div>
              <p className="text-sm leading-6 text-muted">Первая публикация появится здесь сразу после сохранения.</p>
            </div>
          )}
        </Card>

      </section>
    </div>
  );
}
