"use client";

import { Loader2, Mic } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type ProjectOut } from "@/services/openapi-types";
import { clientApiRequest } from "@/services/client-api";

export function ProjectCreateForm({
  initialStandaloneIdeaToken,
  workspaceId,
}: {
  initialStandaloneIdeaToken?: string;
  workspaceId: string | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!workspaceId) {
      setError("После входа ты сможешь сохранить канал и добавить свои примеры.");
      return;
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const nextStep = submitter?.value || "dictation";
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
      const dictationParams = new URLSearchParams({ project: project.id });
      if (initialStandaloneIdeaToken) dictationParams.set("idea", initialStandaloneIdeaToken);
      const destinations: Record<string, string> = {
        dictation: `/app/content/new?${dictationParams.toString()}`,
        examples: `/app/projects/${project.id}/examples?onboarding=1`,
        project: `/app/projects/${project.id}`,
      };
      window.location.assign(destinations[nextStep] ?? destinations.project);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать канал.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mx-auto grid w-full max-w-3xl gap-5" data-testid="project-create-form" onSubmit={submit}>
      <div className="grid gap-2">
        <Badge className="w-fit" tone="info">Новый канал</Badge>
        <h2 className="font-editorial text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          {initialStandaloneIdeaToken ? "Назови канал — идея уже сохранена." : "Сначала назови канал."}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          {initialStandaloneIdeaToken
            ? "После создания ты вернёшься к выбранной идее и сможешь сразу начать запись."
            : "Для начала достаточно названия. Примеры стиля и дополнительные правила можно добавить позже."}
        </p>
      </div>

      <Card className="grid gap-5 p-5 sm:p-6">
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">Название канала</span>
          <input
            autoFocus
            className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
            maxLength={160}
            name="name"
            placeholder="Например: Блог клиники или Личный канал"
            required
          />
        </label>
      </Card>

      {error ? (
        <div className="rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm text-danger" role="alert">
          {error}
        </div>
      ) : null}

      {!workspaceId ? (
        <p className="rounded-xl border border-warning/45 bg-[color-mix(in_srgb,var(--warning),transparent_94%)] p-4 text-sm leading-6 text-muted">
          Войди в кабинет, чтобы создать канал и сразу перейти к первой публикации.
        </p>
      ) : null}

      <Card className="grid gap-3 p-4">
        <Button className="min-h-12 w-full text-base" disabled={isSubmitting || !workspaceId} name="next" type="submit" value="dictation">
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Mic size={18} />}
          {initialStandaloneIdeaToken ? "Создать и продолжить запись" : "Создать и наговорить публикацию"}
        </Button>
        <p className="text-xs leading-5 text-muted">
          Сохранится только канал. Публикация появится после первой записи или сохранённого текста.
        </p>
      </Card>
    </form>
  );
}
