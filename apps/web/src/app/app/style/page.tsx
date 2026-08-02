import Link from "next/link";
import { ArrowRight, BookOpenCheck, Blocks, Mic, Palette, Plus, SlidersHorizontal, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDashboardViewModel } from "@/services/dashboard";

export default async function StylePage() {
  const dashboard = await getDashboardViewModel();
  const hasProjects = dashboard.projects.length > 0;

  return (
    <div className="grid min-w-0 gap-5">
      <section className="grid gap-5 rounded-2xl border border-border bg-sidebar p-5 shadow-panel sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <Badge tone="success">Мой стиль</Badge>
          <h1 className="font-editorial mt-4 max-w-4xl text-4xl leading-tight text-foreground sm:text-5xl">Посты должны звучать как вы.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Сохраните привычную лексику, примеры удачных публикаций и правила проекта. Рубрики нужны только для форматов, которые повторяются.
          </p>
        </div>
        <Button asChild>
          <Link href={hasProjects ? "/app/content/new" : "/app/projects/new"}><Mic size={16} />Проверить на новом посте</Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="group p-5 transition hover:-translate-y-0.5 hover:bg-surface-muted">
          <Palette className="text-primary" size={23} />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Общий голос</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Тон, юмор, обязательные фразы и то, чего в ваших текстах быть не должно.</p>
        </Card>
        <Card className="group p-5 transition hover:-translate-y-0.5 hover:bg-surface-muted">
          <BookOpenCheck className="text-primary" size={23} />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Ваши примеры</h2>
          <p className="mt-2 text-sm leading-6 text-muted">По 3–5 хороших публикаций помогают сохранять вашу лексику и ритм.</p>
        </Card>
        <Card className="group p-5 transition hover:-translate-y-0.5 hover:bg-surface-muted">
          <Blocks className="text-primary" size={23} />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Рубрики</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Отдельные правила и длина только для тех форматов, которые действительно отличаются.</p>
        </Card>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Стиль по проектам</h2>
            <p className="mt-1 text-sm leading-6 text-muted">У каждого канала или блога может быть собственная подача.</p>
          </div>
          <Button asChild size="sm" variant="secondary"><Link href="/app/projects/new"><Plus size={15} />Новый проект</Link></Button>
        </div>

        {hasProjects ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {dashboard.projects.map((project) => {
              const projectId = project.href.split("/").pop();
              return (
                <Card className="grid gap-4 p-5" key={project.href}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{project.name}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{project.note}</p>
                    </div>
                    <Badge tone={project.rubricCount ? "success" : "neutral"}>{project.rubricCount ? `${project.rubricCount} руб.` : "общий стиль"}</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button asChild size="sm" variant="secondary"><Link href={`${project.href}/settings`}><SlidersHorizontal size={15} />Правила</Link></Button>
                    <Button asChild size="sm" variant="secondary"><Link href={`${project.href}/examples`}><BookOpenCheck size={15} />Примеры</Link></Button>
                    <Button asChild size="sm" variant="secondary"><Link href={`${project.href}/rubrics`}><Blocks size={15} />Рубрики</Link></Button>
                  </div>
                  <Link className="inline-flex items-center gap-2 border-t border-border pt-3 text-sm font-medium text-primary hover:text-foreground" href={`/app/content/new?project=${projectId}`}>
                    Создать пост в этом стиле <ArrowRight size={15} />
                  </Link>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="grid justify-items-start gap-4 border-dashed p-6 sm:p-8">
            <Sparkles className="text-primary" size={28} />
            <div>
              <h3 className="text-xl font-semibold text-foreground">Начните с одного проекта</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Назовите блог или канал, расскажите об аудитории и покажите несколько удачных публикаций. Остальное можно добавить позже.</p>
            </div>
            <Button asChild><Link href="/app/projects/new"><Plus size={16} />Настроить мой стиль</Link></Button>
          </Card>
        )}
      </section>
    </div>
  );
}
