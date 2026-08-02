import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Blocks,
  FileText,
  FolderKanban,
  Mic,
  NotebookPen,
  Plus,
  Settings2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { UsageMeter } from "@/components/ui/usage-meter";
import { getDashboardViewModel } from "@/services/dashboard";

export default async function DashboardView() {
  const dashboard = await getDashboardViewModel();
  const hasProjects = dashboard.projects.length > 0;

  return (
    <div className="grid min-w-0 gap-5">
      <section className="grid min-w-0 gap-5 rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-panel sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <Badge tone="success">Главная</Badge>
          <h1 className="font-editorial mt-4 max-w-3xl text-4xl leading-tight text-white sm:text-5xl">
            Что будем публиковать сегодня?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-sidebar-foreground/78 sm:text-base">
            Надиктуйте материал целиком или частями. Проект применит ваш стиль и примеры, а рубрику можно выбрать только при необходимости.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/app/notebook">
              <NotebookPen size={16} />
              Быстрая заметка
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/app/projects/new">
              <Plus size={16} />
              Новый проект
            </Link>
          </Button>
          <Button asChild>
            <Link href={hasProjects ? "/app/content/new" : "/app/projects/new"}>
              <Mic size={16} />
              Начать с диктовки
            </Link>
          </Button>
        </div>
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
            <p className="mt-1 text-sm leading-6 text-muted">Мысли без обязательного проекта, рубрики и запуска ИИ.</p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/app/notebook">Открыть блокнот</Link>
          </Button>
        </div>
        {dashboard.recentNotes.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {dashboard.recentNotes.map((note, index) => (
              <Link className="rounded-lg border border-border bg-surface p-4 shadow-panel transition hover:bg-surface-muted" href={note.href} key={`${note.updatedAt}-${index}`}>
                <p className="line-clamp-3 text-sm leading-6 text-foreground">{note.body || "Пустая заметка"}</p>
                <span className="mt-2 block text-xs text-muted">Открыть и продолжить</span>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="grid justify-items-start gap-3 border-dashed p-5">
            <NotebookPen className="text-muted" size={22} />
            <p className="text-sm leading-6 text-muted">Сохраните идею сейчас — проект можно выбрать позже.</p>
            <Button asChild><Link href="/app/notebook">Записать идею</Link></Button>
          </Card>
        )}
      </section>

      <section className="grid min-w-0 gap-4">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Проекты и каналы</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              У каждого проекта свои общие правила, идеальные примеры и необязательные рубрики.
            </p>
          </div>
          {hasProjects ? (
            <Button asChild size="sm" variant="secondary">
              <Link href="/app/projects">Все проекты</Link>
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
                  <Badge>{project.rubricCount ? `${project.rubricCount} ${project.rubricCount === 1 ? "рубрика" : "рубрики"}` : "без рубрик"}</Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild>
                    <Link href={`/app/content/new?project=${project.href.split("/").pop()}`}>
                      <Mic size={16} />
                      Новая публикация
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={project.href}>
                      Открыть проект
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground" href={`${project.href}/settings`}>
                    <Settings2 size={14} /> Общие правила
                  </Link>
                  <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground" href={`${project.href}/examples`}>
                    <BookOpenCheck size={14} /> Примеры
                  </Link>
                  <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground" href={`${project.href}/rubrics`}>
                    <Blocks size={14} /> Рубрики
                  </Link>
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
              <h3 className="text-xl font-semibold text-foreground">Создайте первый проект</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Назовите канал, опишите аудиторию и задайте общие правила. После этого можно сразу надиктовать обычный пост — рубрика не обязательна.
              </p>
            </div>
            <Button asChild>
              <Link href="/app/projects/new">
                <Plus size={16} />
                Создать проект или канал
              </Link>
            </Button>
          </Card>
        )}
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="grid min-w-0 gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Последние материалы</h2>
              <p className="mt-1 text-sm text-muted">Только ваши реальные черновики и публикации.</p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/app/content">История</Link>
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
              <div className="text-sm font-semibold text-foreground">Материалов пока нет</div>
              <p className="text-sm leading-6 text-muted">Когда вы создадите первую публикацию, она появится здесь и в истории.</p>
            </div>
          )}
        </Card>

        <Card className="grid content-start gap-4 p-5">
          <div>
            <div className="text-sm font-semibold text-foreground">Тариф и использование</div>
            <div className="mt-1 text-xs text-muted">{dashboard.planLabel || "Текущий тариф"}</div>
          </div>
          {dashboard.usageRows.length ? dashboard.usageRows.map((row) => (
            <UsageMeter key={row.label} {...row} />
          )) : (
            <p className="text-sm leading-6 text-muted">Данные использования появятся после первой работы.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
