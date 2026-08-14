"use client";

import Link from "next/link";
import { BookOpenCheck, Loader2, Mic, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clientApiRequest } from "@/services/client-api";
import { type JsonObject, type RubricOut } from "@/services/openapi-types";

const lengthPlatforms = [["telegram", "Telegram"], ["max", "MAX"], ["vk", "VK"], ["instagram", "Instagram"]] as const;

function platformTarget(container: JsonObject, platform: string, bound: "min_chars" | "max_chars"): string {
  const targets = container.length_targets;
  if (!targets || typeof targets !== "object" || Array.isArray(targets)) return "";
  const target = (targets as JsonObject)[platform];
  if (!target || typeof target !== "object" || Array.isArray(target)) return "";
  const value = (target as JsonObject)[bound];
  return typeof value === "number" ? String(value) : "";
}

export function RubricRulesForm({ projectId, rubric }: { projectId: string; rubric: RubricOut }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const lengthTargets = Object.fromEntries(lengthPlatforms.flatMap(([key]) => {
      const minChars = Number(value(`${key}_min`)) || null;
      const maxChars = Number(value(`${key}_max`)) || null;
      return minChars || maxChars ? [[key, { min_chars: minChars, max_chars: maxChars }]] : [];
    }));
    setIsSubmitting(true);
    setMessage(null);
    try {
      await clientApiRequest<RubricOut>(`/api/v1/rubrics/${rubric.id}`, {
        body: {
          description: String(data.get("rules") ?? "").trim() || null,
          editorial_limits: {
            max_chars: Number(data.get("max_chars")) || null,
            min_chars: Number(data.get("min_chars")) || null,
          },
          platform_overrides: {
            ...rubric.platform_overrides,
            length_targets: lengthTargets,
          },
          name: String(data.get("name") ?? "").trim(),
        },
        method: "PATCH",
      });
      setMessage("Правила рубрики сохранены как новая версия.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось сохранить правила рубрики.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mx-auto grid w-full max-w-4xl gap-5" onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2"><Badge tone="info">Рубрика</Badge><Badge>{rubric.active_version_number}-я версия</Badge></div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">{rubric.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Эти правила дополняют общие правила проекта только для публикаций с выбранной рубрикой.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href={`/app/projects/${projectId}/examples?rubric=${rubric.id}`}><BookOpenCheck size={16} />Примеры рубрики</Link></Button>
          <Button asChild><Link href={`/app/content/new?project=${projectId}&rubric=${rubric.id}`}><Mic size={16} />Создать публикацию</Link></Button>
        </div>
      </div>

      <Card className="grid gap-4 p-5 sm:p-6">
        <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Название рубрики</span><input className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary" defaultValue={rubric.name} maxLength={160} name="name" required /></label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">Правила рубрики</span>
          <textarea className="min-h-72 rounded-lg border border-border bg-background px-3 py-3 leading-6 outline-none focus:border-primary" defaultValue={rubric.description ?? ""} name="rules" placeholder="Опишите цель, исходные факты, тон, структуру, обязательные и запрещённые элементы." />
          <span className="text-xs leading-5 text-muted">Пишите обычным языком. Эти правила будут учтены при сборке публикации.</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Минимум знаков</span><input className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary" defaultValue={rubric.editorial_min_chars ?? ""} min={1} name="min_chars" type="number" /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Максимум знаков</span><input className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary" defaultValue={rubric.editorial_max_chars ?? ""} min={1} name="max_chars" type="number" /></label>
        </div>
        <div className="grid gap-3 border-t border-border pt-4">
          <div><div className="text-sm font-semibold text-foreground">Длина отдельно по площадкам</div><p className="mt-1 text-xs leading-5 text-muted">Заполненная цель рубрики имеет приоритет над общей целью проекта.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {lengthPlatforms.map(([key, label]) => (
              <fieldset className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3" key={key}>
                <legend className="px-1 text-sm font-semibold text-foreground">{label}</legend>
                <label className="grid gap-1 text-xs text-muted">От<input className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground" defaultValue={platformTarget(rubric.platform_overrides, key, "min_chars")} min={1} name={`${key}_min`} type="number" /></label>
                <label className="grid gap-1 text-xs text-muted">До<input className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground" defaultValue={platformTarget(rubric.platform_overrides, key, "max_chars")} min={1} name={`${key}_max`} type="number" /></label>
              </fieldset>
            ))}
          </div>
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isSubmitting} type="submit">{isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}Сохранить новую версию</Button>
        {message ? <span className="text-sm text-muted">{message}</span> : null}
      </div>
    </form>
  );
}
