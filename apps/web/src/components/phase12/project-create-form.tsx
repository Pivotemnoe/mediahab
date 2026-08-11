"use client";

import { ArrowRight, BookOpenCheck, ChevronDown, Loader2, Mic, SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type ProjectOut } from "@/services/openapi-types";
import { clientApiRequest } from "@/services/client-api";

export function ProjectCreateForm({ workspaceId }: { workspaceId: string | null }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!workspaceId) {
      setError("После входа вы сможете сохранить канал и добавить свои примеры.");
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const nextStep = submitter?.value || "project";
    const data = new FormData(event.currentTarget);
    setError(null);
    setIsSubmitting(true);
    try {
      const project = await clientApiRequest<ProjectOut>(`/api/v1/workspaces/${workspaceId}/projects`, {
        body: {
          ai_mode_default: "editor",
          content_domain: String(data.get("content_domain") ?? "").trim() || null,
          description: String(data.get("description") ?? "").trim() || null,
          language: "ru-RU",
          name: String(data.get("name") ?? "").trim(),
          tone_config: {
            audience: String(data.get("audience") ?? "").trim(),
            avoid: String(data.get("avoid") ?? "").trim(),
            must_include: String(data.get("must_include") ?? "").trim(),
            structure: String(data.get("structure") ?? "").trim(),
            voice: String(data.get("voice") ?? "").trim(),
          },
          cta_config: {
            guidance: String(data.get("cta") ?? "").trim(),
          },
          humor_config: {
            guidance: String(data.get("humor") ?? "").trim(),
          },
        },
        method: "POST",
      });
      const destinations: Record<string, string> = {
        dictation: `/app/content/new?project=${project.id}`,
        examples: `/app/projects/${project.id}/examples?onboarding=1`,
        project: `/app/projects/${project.id}`,
      };
      window.location.assign(destinations[nextStep] ?? destinations.project);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать проект.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mx-auto grid w-full max-w-3xl gap-5" data-testid="project-create-form" onSubmit={submit}>
      <div className="grid gap-2">
        <Badge className="w-fit" tone="info">Первый шаг</Badge>
        <h2 className="font-editorial text-4xl font-semibold leading-tight text-foreground sm:text-5xl">Сначала — название и удачные посты.</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Назовите канал, а затем покажите публикации, чья подача вам нравится. Этого достаточно, чтобы начать; правила и рубрики можно добавить позже.
        </p>
      </div>

      <Card className="grid gap-5 p-5 sm:p-6">
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">Название проекта или канала</span>
          <input
            autoFocus
            className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
            maxLength={160}
            name="name"
            placeholder="Например: Блог клиники или Личный канал"
            required
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">О чём проект</span>
          <input
            className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
            name="content_domain"
            placeholder="Тематика: медицина, еда, путешествия, личный блог…"
          />
        </label>
        <div className="rounded-xl border border-primary/35 bg-[color-mix(in_srgb,var(--primary),transparent_94%)] p-4 text-sm leading-6 text-muted">
          <strong className="text-foreground">Следом добавим примеры.</strong> Можно начать с нескольких, но лучше собрать 10 или больше сильных постов — своих или чужих, если вам близка их подача. Они задают стиль, а не факты нового материала.
        </div>

        <details className="group rounded-xl border border-border bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <span className="flex items-center gap-2"><SlidersHorizontal size={17} />Дополнительные настройки</span>
            <ChevronDown className="transition group-open:rotate-180" size={17} />
          </summary>
          <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Желаемая структура</span>
            <textarea
              className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
              name="structure"
              placeholder="Например: сильное начало, 3–4 смысловых блока, вывод и вопрос читателю"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Что обязательно учитывать</span>
            <textarea
              className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
              name="must_include"
              placeholder="Факты, дисклеймеры, обращения, постоянные элементы"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Чего нельзя делать</span>
            <textarea
              className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
              name="avoid"
              placeholder="Запрещённые слова, выдуманные факты, канцелярит, нежелательные обещания"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Юмор и настроение</span>
            <textarea
              className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
              name="humor"
              placeholder="Например: лёгкая ирония допустима, сарказм и насмешки нельзя"
            />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-semibold text-foreground">Как завершать публикации</span>
            <textarea
              className="min-h-20 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
              name="cta"
              placeholder="Например: задать вопрос, пригласить сохранить пост или перейти по ссылке"
            />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-semibold text-foreground">Кому вы пишете</span>
          <textarea
            className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            name="audience"
            placeholder="Кто читатель и что ему важно"
          />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-semibold text-foreground">Как должен звучать текст</span>
          <textarea
            className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            name="voice"
            placeholder="Например: живо, по делу, без канцелярита и выдуманных фактов"
          />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
          <span className="font-semibold text-foreground">Короткое описание</span>
          <textarea
            className="min-h-20 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            maxLength={5000}
            name="description"
            placeholder="Необязательно. Можно дополнить позже в настройках."
          />
          </label>
          </div>
        </details>
      </Card>

      {error ? (
        <div className="rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm text-danger" role="alert">
          {error}
        </div>
      ) : null}

      {!workspaceId ? (
        <p className="rounded-xl border border-warning/45 bg-[color-mix(in_srgb,var(--warning),transparent_94%)] p-4 text-sm leading-6 text-muted">
          После входа здесь можно создать свой канал и сразу сохранить подборку удачных постов. Сейчас доступен просмотр сценария.
        </p>
      ) : null}

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <Button disabled={isSubmitting || !workspaceId} name="next" type="submit" value="examples">
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <BookOpenCheck size={18} />}
          Создать и добавить примеры
        </Button>
        <Button disabled={isSubmitting || !workspaceId} name="next" type="submit" value="dictation" variant="secondary">
          <Mic size={18} />Пока без примеров — диктовать
        </Button>
        <button className="inline-flex items-center gap-2 justify-self-start text-sm font-medium text-muted hover:text-foreground sm:col-span-2" disabled={isSubmitting || !workspaceId} name="next" type="submit" value="project">
          Создать и открыть настройки <ArrowRight size={15} />
        </button>
        <p className="text-xs leading-5 text-muted sm:col-span-2">
          Рубрика не обязательна. Она понадобится только для повторяемого формата, который действительно отличается от обычных публикаций.
        </p>
      </Card>
    </form>
  );
}
