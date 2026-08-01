"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clientApiRequest } from "@/services/client-api";

type DraftExample = { id: number; text: string; title: string };

export function ExamplesImportForm({
  initialRubricId,
  projectId,
  rubrics,
}: {
  initialRubricId?: string;
  projectId: string;
  rubrics: Array<{ id: string; name: string }>;
}) {
  const [rows, setRows] = useState<DraftExample[]>([{ id: 1, text: "", title: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  let nextId = Math.max(...rows.map((row) => row.id), 0) + 1;

  function updateRow(id: number, field: "text" | "title", value: string) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const data = new FormData(event.currentTarget);
    const rubricId = String(data.get("rubric_id") ?? "").trim() || null;
    const examples = rows
      .filter((row) => row.text.trim())
      .map((row) => ({
        manual_quality_score: 9,
        rubric_id: rubricId,
        source_type: "manual",
        text: row.text.trim(),
        title: row.title.trim() || null,
      }));
    if (!examples.length) {
      setError("Добавьте хотя бы один текст примера.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await clientApiRequest(`/api/v1/projects/${projectId}/examples/import`, {
        body: { approve_immediately: true, examples },
        method: "POST",
      });
      window.location.assign(`/app/projects/${projectId}/examples`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить примеры.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="grid gap-4 p-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Добавить идеальные публикации</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Добавьте несколько текстов, которые вам нравятся. Общие примеры работают для всего канала; рубричные имеют приоритет только внутри выбранной рубрики.
        </p>
      </div>
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-foreground">К каким правилам относятся примеры</span>
          <select className="h-11 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary" defaultValue={initialRubricId ?? ""} name="rubric_id">
            <option value="">Ко всему проекту — общие примеры канала</option>
            {rubrics.map((rubric) => <option key={rubric.id} value={rubric.id}>К рубрике «{rubric.name}»</option>)}
          </select>
        </label>

        <div className="grid gap-3">
          {rows.map((row, index) => (
            <div className="grid gap-3 rounded-xl border border-border bg-background p-4" key={row.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">Пример {index + 1}</div>
                {rows.length > 1 ? (
                  <Button aria-label={`Удалить пример ${index + 1}`} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} size="icon" type="button" variant="ghost">
                    <Trash2 size={16} />
                  </Button>
                ) : null}
              </div>
              <input className="h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary" onChange={(event) => updateRow(row.id, "title", event.currentTarget.value)} placeholder="Название для себя — необязательно" value={row.title} />
              <textarea className="min-h-40 rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 outline-none focus:border-primary" onChange={(event) => updateRow(row.id, "text", event.currentTarget.value)} placeholder="Вставьте полный текст удачной публикации" value={row.text} />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { setRows((current) => [...current, { id: nextId, text: "", title: "" }]); nextId += 1; }} type="button" variant="secondary">
            <Plus size={16} />
            Ещё пример
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Сохранить и одобрить
          </Button>
        </div>
        {error ? <div className="rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm text-danger">{error}</div> : null}
      </form>
    </Card>
  );
}
