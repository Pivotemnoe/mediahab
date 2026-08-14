"use client";

import { ArrowLeft, BookOpenCheck, Loader2, Mic } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clientApiRequest } from "@/services/client-api";
import { type RubricOut } from "@/services/openapi-types";

const transliteration: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slug(value: string): string {
  const normalized = value.toLowerCase().split("").map((character) => transliteration[character] ?? character).join("");
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140) || `rubric-${Date.now()}`;
}

function value(data: FormData, key: string): string {
  return String(data.get(key) ?? "").trim();
}

export function RubricCreateForm({ projectId, projectLabel }: { projectId: string; projectLabel: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const next = submitter?.value === "examples" ? "examples" : "dictation";
    const data = new FormData(event.currentTarget);
    const name = value(data, "name");
    const minChars = Number(value(data, "min_chars")) || null;
    const maxChars = Number(value(data, "max_chars")) || null;
    const rules = [
      ["Цель", value(data, "purpose")],
      ["Исходные факты", value(data, "source_prompt")],
      ["Тон", value(data, "tone")],
      ["Структура", value(data, "structure")],
      ["Обязательно", value(data, "required_elements")],
      ["Запрещено", value(data, "forbidden_elements")],
    ].filter(([, text]) => text).map(([label, text]) => `${label}: ${text}`).join("\n");

    setError(null);
    setIsSubmitting(true);
    try {
      const rubric = await clientApiRequest<RubricOut>(`/api/v1/projects/${projectId}/rubrics`, {
        body: {
          active: true,
          ai_mode: "editor",
          description: rules || null,
          editorial_limits: { max_chars: maxChars, min_chars: minChars },
          generated_fields: ["hook", "master_text", "platform_variants"],
          input_flow: [{
            description: value(data, "source_prompt") || "Наговори или вставь важные факты.",
            fact_locked: true,
            key: "source",
            label: "Исходная мысль",
            required: true,
            type: "voice_or_long_text",
          }],
          key: slug(name),
          name,
          platform_overrides: {
            instagram: { enabled: data.get("instagram") === "on" },
            max: { enabled: data.get("max") === "on" },
            telegram: { enabled: data.get("telegram") === "on" },
          },
        },
        method: "POST",
      });
      window.location.assign(
        next === "examples"
          ? `/app/projects/${projectId}/examples?rubric=${rubric.id}`
          : `/app/content/new?project=${projectId}&rubric=${rubric.id}`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать формат.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mx-auto grid w-full max-w-4xl gap-5" onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">{projectLabel}</Badge>
            <Badge>необязательно</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Новый формат</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Сохрани отдельные правила для публикаций, которые часто повторяются. Обычные тексты продолжат работать по правилам канала.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/app/projects/${projectId}/rubrics`}><ArrowLeft size={16} />К форматам</Link>
        </Button>
      </div>

      <Card className="grid gap-4 p-5 sm:p-6">
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">Название формата</span>
          <input autoFocus className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary" maxLength={160} name="name" placeholder="Например: Разбор случая или Итоги недели" required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Для чего нужен этот формат</span>
            <textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" name="purpose" placeholder="Цель, читатель и ожидаемый результат" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Какие факты собирать</span>
            <textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" name="source_prompt" placeholder="Что обязательно наговорить или вставить перед подготовкой текста" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Тон</span>
            <textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" name="tone" placeholder="Чем подача этого формата отличается от обычной подачи канала" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Структура</span>
            <textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" name="structure" placeholder="Порядок блоков, начало, вывод" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Обязательные элементы</span>
            <textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" name="required_elements" placeholder="Факты, предупреждения, постоянные блоки" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Запрещённые элементы</span>
            <textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" name="forbidden_elements" placeholder="Чего в таком формате быть не должно" />
          </label>
        </div>
        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Минимальная длина</span>
            <input className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary" min={1} name="min_chars" placeholder="Необязательно" type="number" />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Максимальная длина</span>
            <input className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary" min={1} name="max_chars" placeholder="Например: 4000" type="number" />
          </label>
        </div>
        <fieldset className="grid gap-2 border-t border-border pt-4">
          <legend className="mb-2 text-sm font-semibold text-foreground">Площадки по умолчанию</legend>
          <div className="flex flex-wrap gap-3">
            {["telegram", "max", "instagram"].map((platform) => (
              <label className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm" key={platform}>
                <input defaultChecked name={platform} type="checkbox" />
                {platform === "telegram" ? "Telegram" : platform === "max" ? "MAX" : "Instagram"}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      {error ? <div className="rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm text-danger">{error}</div> : null}

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <Button disabled={isSubmitting} name="next" type="submit" value="dictation">
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Mic size={18} />}
          Создать и начать публикацию
        </Button>
        <Button disabled={isSubmitting} name="next" type="submit" value="examples" variant="secondary">
          <BookOpenCheck size={18} />
          Создать и добавить примеры
        </Button>
        <p className="text-xs leading-5 text-muted sm:col-span-2">
          Правила можно менять позже. Уже сохранённые публикации останутся без изменений.
        </p>
      </Card>
    </form>
  );
}
