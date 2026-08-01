"use client";

import { BookOpenCheck, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RichTextEditor } from "@/components/phase12/rich-text-editor";
import { normalizeRichText, richTextPlain } from "@/lib/rich-text";
import { clientApiRequest } from "@/services/client-api";
import { type JsonObject, type ProjectOut } from "@/services/openapi-types";

function stringValue(object: JsonObject, key: string): string {
  return typeof object[key] === "string" ? String(object[key]) : "";
}

function voiceRules(project: ProjectOut): JsonObject {
  const nested = project.tone_config.voice;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as JsonObject
    : project.tone_config;
}

const lengthPlatforms = [
  ["telegram", "Telegram"],
  ["max", "MAX"],
  ["vk", "VK"],
  ["instagram", "Instagram"],
] as const;

function platformTarget(container: JsonObject, platform: string, bound: "min_chars" | "max_chars"): string {
  const targets = container.platform_targets;
  if (!targets || typeof targets !== "object" || Array.isArray(targets)) return "";
  const target = (targets as JsonObject)[platform];
  if (!target || typeof target !== "object" || Array.isArray(target)) return "";
  const value = (target as JsonObject)[bound];
  return typeof value === "number" ? String(value) : "";
}

export function ProjectRulesForm({ project, projectId }: { project: ProjectOut; projectId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rules = voiceRules(project);
  const [footerRichText, setFooterRichText] = useState(() => normalizeRichText(
    project.cta_config.footer_rich_text,
    stringValue(project.cta_config, "footer_template"),
  ));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const ctaConfig = { ...project.cta_config };
    const platformTargets = Object.fromEntries(lengthPlatforms.flatMap(([key]) => {
      const minChars = Number(value(`${key}_min`)) || null;
      const maxChars = Number(value(`${key}_max`)) || null;
      return minChars || maxChars ? [[key, { min_chars: minChars, max_chars: maxChars }]] : [];
    }));
    delete ctaConfig.header_template;
    setIsSubmitting(true);
    setMessage(null);
    try {
      await clientApiRequest<ProjectOut>(`/api/v1/projects/${projectId}`, {
        body: {
          content_domain: value("content_domain") || null,
          character_count_policy: {
            ...project.character_count_policy,
            platform_targets: platformTargets,
            unit: "unicode_code_points",
          },
          cta_config: {
            ...ctaConfig,
            footer_rich_text: footerRichText,
            footer_template: richTextPlain(footerRichText).trim(),
            guidance: value("cta"),
          },
          description: value("description") || null,
          humor_config: { guidance: value("humor") },
          name: value("name"),
          tone_config: {
            audience: value("audience"),
            avoid: value("avoid"),
            must_include: value("must_include"),
            structure: value("structure"),
            voice: value("voice"),
          },
        },
        method: "PATCH",
      });
      setMessage("Общие правила сохранены как новая версия проекта.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Не удалось сохранить правила.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mx-auto grid w-full max-w-4xl gap-5" onSubmit={submit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2"><Badge tone="info">{project.name}</Badge><Badge>общие правила</Badge></div>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Правила всего канала</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Эти правила применяются ко всем публикациям проекта. Если выбрана рубрика, её более точные правила дополняют общие.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/app/projects/${projectId}/examples`}><BookOpenCheck size={16} />Идеальные примеры</Link>
        </Button>
      </div>

      <Card className="grid gap-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Название</span><input className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary" defaultValue={project.name} maxLength={160} name="name" required /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Тематика</span><input className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary" defaultValue={project.content_domain ?? ""} name="content_domain" /></label>
        </div>
        <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Описание проекта</span><textarea className="min-h-20 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" defaultValue={project.description ?? ""} maxLength={5000} name="description" /></label>
        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Аудитория</span><textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" defaultValue={stringValue(rules, "audience")} name="audience" /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Голос и тон</span><textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" defaultValue={stringValue(rules, "voice")} name="voice" /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Структура</span><textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" defaultValue={stringValue(rules, "structure")} name="structure" /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Обязательно учитывать</span><textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" defaultValue={stringValue(rules, "must_include")} name="must_include" /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Запрещено</span><textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" defaultValue={stringValue(rules, "avoid")} name="avoid" /></label>
          <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Юмор и настроение</span><textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" defaultValue={stringValue(project.humor_config, "guidance")} name="humor" /></label>
        </div>
        <label className="grid gap-1.5 text-sm"><span className="font-semibold text-foreground">Завершение и CTA</span><textarea className="min-h-20 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" defaultValue={stringValue(project.cta_config, "guidance")} name="cta" /></label>
        <div className="grid gap-4 border-t border-border pt-4">
          <div>
            <div className="text-sm font-semibold text-foreground">Обычная длина по площадкам</div>
            <p className="mt-1 text-xs leading-5 text-muted">Это редакционная цель, а не технический максимум. Пустые поля используют безопасный профиль системы.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {lengthPlatforms.map(([key, label]) => (
              <fieldset className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3" key={key}>
                <legend className="px-1 text-sm font-semibold text-foreground">{label}</legend>
                <label className="grid gap-1 text-xs text-muted">От<input className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground" defaultValue={platformTarget(project.character_count_policy, key, "min_chars")} min={1} name={`${key}_min`} type="number" /></label>
                <label className="grid gap-1 text-xs text-muted">До<input className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground" defaultValue={platformTarget(project.character_count_policy, key, "max_chars")} min={1} name={`${key}_max`} type="number" /></label>
              </fieldset>
            ))}
          </div>
        </div>
        <div className="grid gap-4 border-t border-border pt-4">
          <div>
            <div className="text-sm font-semibold text-foreground">Постоянный подвал со ссылками</div>
            <p className="mt-1 text-xs leading-5 text-muted">
              Сохраните один раз. Подвал будет без изменений добавляться в конец каждой новой версии и попадёт в скопированный текст вместе с обычными https-ссылками.
            </p>
          </div>
          <div className="grid gap-1.5 text-sm">
            <span className="font-semibold text-foreground">Текст и ссылки в конце публикации <span className="font-normal text-muted">(необязательно)</span></span>
            <RichTextEditor
              ariaLabel="Постоянный подвал публикации"
              minHeightClass="min-h-28"
              value={footerRichText}
              onChange={setFooterRichText}
            />
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
