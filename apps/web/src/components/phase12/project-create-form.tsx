"use client";

import { ArrowRight, BookOpenCheck, Loader2, Mic } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type ProjectOut } from "@/services/openapi-types";
import { clientApiRequest } from "@/services/client-api";

export function ProjectCreateForm({ workspaceId }: { workspaceId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
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
        <h1 className="text-3xl font-semibold leading-tight text-foreground">Создайте проект или канал</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Это отдельное направление со своими правилами и примерами. Если у вас несколько каналов или брендов, для каждого можно создать свой проект.
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
        <div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
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
        </div>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">Кому вы пишете</span>
          <textarea
            className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            name="audience"
            placeholder="Кто читатель и что ему важно"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">Как должен звучать текст</span>
          <textarea
            className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            name="voice"
            placeholder="Например: живо, по делу, без канцелярита и выдуманных фактов"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">Короткое описание</span>
          <textarea
            className="min-h-20 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            maxLength={5000}
            name="description"
            placeholder="Необязательно. Можно дополнить позже в настройках."
          />
        </label>
      </Card>

      {error ? (
        <div className="rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <Card className="grid gap-3 p-4 md:grid-cols-3">
        <Button disabled={isSubmitting} name="next" type="submit" value="project">
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          Создать проект
        </Button>
        <Button disabled={isSubmitting} name="next" type="submit" value="examples" variant="secondary">
          <BookOpenCheck size={18} />
          Создать и добавить примеры
        </Button>
        <Button disabled={isSubmitting} name="next" type="submit" value="dictation" variant="secondary">
          <Mic size={18} />
          Создать и диктовать
        </Button>
        <p className="text-xs leading-5 text-muted md:col-span-3">
          Идеальные примеры и рубрики можно добавить сразу или позже. Рубрика нужна только для повторяемых форматов; обычный пост создаётся по общим правилам проекта.
        </p>
      </Card>
    </form>
  );
}
