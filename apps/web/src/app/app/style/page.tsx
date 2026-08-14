import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Blocks,
  ChevronDown,
  Mic,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStyleOverviewViewModel } from "@/services/ai";

const QUICK_START_EXAMPLES = 3;
const STEADY_STYLE_EXAMPLES = 10;

function styleProgressCopy(count: number): string {
  if (count <= 0) return "Можно начать без примеров. Добавьте 3 поста, чтобы приблизить подачу.";
  if (count < QUICK_START_EXAMPLES) return `Для быстрого старта осталось: ${QUICK_START_EXAMPLES - count}.`;
  if (count < STEADY_STYLE_EXAMPLES) return "Быстрый старт готов. Чем ближе к 10, тем устойчивее стиль.";
  return "Стиль настроен. Обновляйте примеры, когда меняется подача канала.";
}

export default async function StylePage() {
  const overview = await getStyleOverviewViewModel();
  const projectsUnavailable = overview.modeLabel === "api" && Boolean(overview.notice) && overview.projects.length === 0;
  const projectExamples = overview.projects;

  return (
    <div className="grid min-w-0 gap-5">
      <section className="grid min-w-0 gap-5 rounded-2xl border border-border bg-sidebar p-5 shadow-panel sm:p-7">
        <div className="min-w-0">
          <Badge tone="success">Мой стиль</Badge>
          <h1 className="font-editorial mt-4 max-w-3xl break-words text-4xl leading-tight text-foreground sm:text-5xl">
            Покажите удачные посты — остальное подстроим.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Добавьте публикации, чья подача вам нравится. Можно свои или чужие: они служат ориентиром по ритму и голосу, а факты нового материала вы задаёте новой диктовкой.
          </p>
        </div>
      </section>

      {overview.modeLabel === "api" && overview.notice ? (
        <Card className="border-warning/55 bg-[color-mix(in_srgb,var(--warning),transparent_94%)] p-4 text-sm leading-6 text-muted" role="status">
          {overview.notice} Сохранённые каналы и примеры не удалены.
        </Card>
      ) : null}

      <Card className="grid min-w-0 gap-5 border-primary/45 p-5 sm:p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="text-primary" size={22} />
            <h2 className="text-2xl font-semibold text-foreground">Стиль настраивается по удачным постам</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Трёх публикаций достаточно для быстрого старта. Десять и больше помогают устойчивее передавать лексику, длину фраз и настроение. Для каждого нового поста «Наговори» сам выберет подходящие примеры.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
            <Badge tone="success">общий стиль канала</Badge>
            <Badge>рубрика — по желанию</Badge>
            <Badge>факты всегда берём из новой диктовки</Badge>
          </div>
        </div>
      </Card>

      <section className="grid min-w-0 gap-4">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Каналы и проекты</h2>
            <p className="mt-1 text-sm leading-6 text-muted">У каждого канала своя подборка удачных публикаций.</p>
          </div>
          <Button asChild size="sm" variant="secondary"><Link href="/app/projects/new"><Plus size={15} />Новый канал</Link></Button>
        </div>

        {projectExamples.length ? (
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            {projectExamples.map(({ approvedCount: count, href, id: projectId, name, note }) => {
              return (
                <Card className="grid min-w-0 gap-4 p-5" key={href}>
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-semibold text-foreground">{name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{note}</p>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex justify-between gap-3 text-xs text-muted"><span>Примеров для стиля</span><span>{count === null ? "повторите позже" : `${Math.min(count, STEADY_STYLE_EXAMPLES)} из ${STEADY_STYLE_EXAMPLES}`}</span></div>
                    <progress aria-label={count === null ? "Количество примеров временно не загрузилось" : `Добавлено ${count} постов: быстрый старт от ${QUICK_START_EXAMPLES}, устойчивый стиль от ${STEADY_STYLE_EXAMPLES}`} className="h-1.5 w-full accent-primary" max={STEADY_STYLE_EXAMPLES} value={count === null ? undefined : Math.min(count, STEADY_STYLE_EXAMPLES)} />
                    <p className="text-xs leading-5 text-muted">{count === null ? "Подборка сохранена; повторите загрузку страницы позже." : styleProgressCopy(count)}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button asChild><Link href={`${href}/examples`}><BookOpenCheck size={16} />Добавить примеры</Link></Button>
                    <Button asChild variant="secondary"><Link href={`/app/content/new?project=${projectId}`}><Mic size={16} />Надиктовать пост</Link></Button>
                  </div>
                  <details className="group border-t border-border pt-3">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
                      <ChevronDown className="transition group-open:rotate-180" size={15} />Дополнительные настройки
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground" href={`${href}/settings`}><SlidersHorizontal size={14} />Правила</Link>
                      <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground" href={`${href}/rubrics`}><Blocks size={14} />Рубрики</Link>
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        ) : projectsUnavailable ? (
          <Card className="grid justify-items-start gap-3 border-warning/55 p-6">
            <ShieldCheck className="text-warning" size={28} />
            <h3 className="text-xl font-semibold text-foreground">Каналы сейчас не загрузились</h3>
            <p className="max-w-2xl text-sm leading-6 text-muted">Это ошибка чтения, а не пустой аккаунт. Обновите страницу; создавать канал заново не нужно.</p>
            <Button asChild><a href="/app/style"><ArrowRight size={16} />Повторить загрузку</a></Button>
          </Card>
        ) : (
          <Card className="grid justify-items-start gap-4 border-dashed p-6 sm:p-8">
            <BookOpenCheck className="text-primary" size={30} />
            <div>
              <h3 className="text-xl font-semibold text-foreground">Начните с названия и примеров</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Анкету заполнять не нужно. Назовите канал и сразу добавьте публикации, которые лучше всего показывают желаемую подачу.</p>
            </div>
            <Button asChild><Link href="/app/projects/new"><Plus size={16} />Создать канал</Link></Button>
          </Card>
        )}
      </section>

    </div>
  );
}
