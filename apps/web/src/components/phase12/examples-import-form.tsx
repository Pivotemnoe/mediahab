"use client";

import { CheckCircle2, ChevronDown, FileStack, Loader2, Mic, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clientApiRequest } from "@/services/client-api";

type DraftExample = { id: number; text: string };
type ImportResult = { duplicates: number; imported: number };

const QUICK_START_EXAMPLES = 3;
const STEADY_STYLE_EXAMPLES = 10;

function russianCountLabel(value: number, one: string, few: string, many: string): string {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function exampleTitle(text: string, index: number): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim())?.trim();
  return firstLine ? firstLine.slice(0, 80) : `Удачный пост ${index + 1}`;
}

export function splitBulkExamples(value: string): string[] {
  return value
    .split(/\r?\n\s*---+\s*\r?\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ExamplesImportForm({
  disabledReason,
  existingApprovedCount = 0,
  initialRubricId,
  projectId,
  rubrics,
}: {
  disabledReason?: string;
  existingApprovedCount?: number;
  initialRubricId?: string;
  projectId: string;
  rubrics: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<DraftExample[]>([]);
  const [draft, setDraft] = useState("");
  const [bulkDraft, setBulkDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const pendingDraftCount = draft.trim() && !rows.some((row) => row.text === draft.trim()) ? 1 : 0;
  const selectedCount = rows.length + pendingDraftCount;
  const readinessCount = existingApprovedCount + selectedCount;
  const nextId = useMemo(() => Math.max(...rows.map((row) => row.id), 0) + 1, [rows]);

  function addTexts(texts: string[]): boolean {
    const existing = new Set(rows.map((row) => row.text));
    const unique: string[] = [];
    for (const rawText of texts) {
      const text = rawText.trim();
      if (!text || existing.has(text)) continue;
      existing.add(text);
      unique.push(text);
    }
    if (!unique.length) {
      setError("Новых постов в этой вставке не найдено.");
      return false;
    }
    setRows((current) => [
      ...current,
      ...unique.map((text, index) => ({ id: nextId + index, text })),
    ]);
    setError(null);
    setResult(null);
    return true;
  }

  function addCurrentDraft() {
    if (!draft.trim()) {
      setError("Сначала вставьте полный текст удачного поста.");
      return;
    }
    if (addTexts([draft])) setDraft("");
  }

  function addBulkDraft() {
    const texts = splitBulkExamples(bulkDraft);
    if (texts.length < 2) {
      setError("Разделите посты отдельной строкой --- и попробуйте ещё раз.");
      return;
    }
    if (addTexts(texts)) setBulkDraft("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (disabledReason) {
      setError(disabledReason);
      return;
    }
    const data = new FormData(event.currentTarget);
    const rubricId = String(data.get("rubric_id") ?? "").trim() || null;
    const texts = Array.from(new Set([...rows.map((row) => row.text), ...(draft.trim() ? [draft.trim()] : [])]));
    if (!texts.length) {
      setError("Добавьте хотя бы один полный текст поста.");
      return;
    }
    setError(null);
    setResult(null);
    setIsSubmitting(true);
    try {
      const response = await clientApiRequest<{ duplicates: unknown[]; imported: unknown[] }>(`/api/v1/projects/${projectId}/examples/import`, {
        body: {
          approve_immediately: true,
          examples: texts.map((text, index) => ({
            manual_quality_score: 9,
            rubric_id: rubricId,
            source_type: "manual",
            text,
            title: exampleTitle(text, index),
          })),
        },
        method: "POST",
      });
      setRows([]);
      setDraft("");
      setResult({ duplicates: response.duplicates.length, imported: response.imported.length });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить примеры.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="grid min-w-0 gap-5 border-primary/45 p-5 sm:p-6" data-testid="examples-first-import">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <Badge tone="success">Главный способ передать стиль</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Добавьте удачные посты</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Вставьте 3–10 удачных постов из ChatGPT, Telegram, VK или другого источника, которым вы вправе пользоваться. Они задают ориентир по ритму, структуре и тону; факты нового материала задаёт новая диктовка.
          </p>
        </div>
        <div className="min-w-52 rounded-xl border border-border bg-background p-3">
          <div className="flex items-end justify-between gap-3"><span className="text-xs text-muted">Быстрый старт</span><strong className="text-lg text-primary">{Math.min(readinessCount, QUICK_START_EXAMPLES)} из {QUICK_START_EXAMPLES}</strong></div>
          <progress aria-label={`Для быстрого старта сохранено и выбрано ${Math.min(readinessCount, QUICK_START_EXAMPLES)} из ${QUICK_START_EXAMPLES} постов`} className="mt-2 h-2 w-full accent-primary" max={QUICK_START_EXAMPLES} value={Math.min(readinessCount, QUICK_START_EXAMPLES)} />
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-2 text-xs text-muted"><span>Устойчивый стиль</span><strong className="text-foreground">{Math.min(readinessCount, STEADY_STYLE_EXAMPLES)} из {STEADY_STYLE_EXAMPLES}</strong></div>
          <progress aria-label={`Для устойчивого стиля сохранено и выбрано ${Math.min(readinessCount, STEADY_STYLE_EXAMPLES)} из ${STEADY_STYLE_EXAMPLES} постов`} className="mt-1.5 h-1.5 w-full accent-success" max={STEADY_STYLE_EXAMPLES} value={Math.min(readinessCount, STEADY_STYLE_EXAMPLES)} />
          <p className="mt-2 text-xs leading-5 text-muted">Сохранено: {existingApprovedCount}. В этой загрузке: {selectedCount}. Ни один уровень не блокирует работу.</p>
        </div>
      </div>

      <form className="grid min-w-0 gap-5" onSubmit={submit}>
        <fieldset className="contents" disabled={isSubmitting}>
        <div className="grid min-w-0 gap-3 rounded-xl border border-border bg-background p-4">
          <label className="grid min-w-0 gap-1.5 text-sm" htmlFor="style-example-draft">
            <span className="font-semibold text-foreground">Вставьте полный текст одного удачного поста</span>
            <textarea
              className="min-h-44 min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-base leading-6 outline-none focus:border-primary"
              id="style-example-draft"
              onChange={(event) => { setDraft(event.currentTarget.value); setResult(null); }}
              placeholder="Скопируйте публикацию целиком — например, готовый текст из ChatGPT или уже опубликованный пост"
              value={draft}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button className="min-h-11" onClick={addCurrentDraft} type="button" variant="secondary"><Plus size={16} />Добавить в подборку</Button>
            <span className="text-xs leading-5 text-muted">Повторяйте, пока не соберёте нужную подборку.</span>
          </div>
        </div>

        {rows.length ? (
          <section className="grid min-w-0 gap-3" aria-label="Выбранные удачные посты">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-foreground">В подборке: {rows.length}</h3>
              <span className="text-xs text-muted">Можно удалить лишнее перед сохранением</span>
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              {rows.map((row, index) => (
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl border border-border bg-surface p-3" key={row.id}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">Пост {index + 1}</div>
                    <p className="mt-1 line-clamp-3 break-words text-xs leading-5 text-muted">{row.text}</p>
                    <span className="mt-1 block text-xs text-muted">
                      {row.text.length.toLocaleString("ru-RU")} {russianCountLabel(row.text.length, "знак", "знака", "знаков")}
                    </span>
                  </div>
                  <Button aria-label={`Удалить пост ${index + 1}`} onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} size="icon" type="button" variant="ghost"><Trash2 size={16} /></Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <details className="group rounded-xl border border-border bg-background">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <span className="flex items-center gap-2"><FileStack size={17} />Вставить 3–10 постов сразу — например из ChatGPT</span>
            <ChevronDown className="transition group-open:rotate-180" size={17} />
          </summary>
          <div className="grid gap-3 border-t border-border p-4">
            <p className="text-sm leading-6 text-muted">Поставьте отдельную строку <strong className="text-foreground">---</strong> между публикациями. Так абзацы внутри каждого поста сохранятся правильно.</p>
            <textarea className="min-h-44 rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-6 outline-none focus:border-primary" onChange={(event) => setBulkDraft(event.currentTarget.value)} placeholder={'Первый пост целиком\n---\nВторой пост целиком'} value={bulkDraft} />
            <Button className="min-h-11 justify-self-start" onClick={addBulkDraft} type="button" variant="secondary"><Plus size={16} />Разобрать и добавить</Button>
          </div>
        </details>

        <details className="group rounded-xl border border-border bg-background" open={Boolean(initialRubricId)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <span>Разделить по рубрике — необязательно</span>
            <ChevronDown className="transition group-open:rotate-180" size={17} />
          </summary>
          <div className="grid gap-2 border-t border-border p-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-foreground">Куда отнести эту подборку</span>
              <select className="h-11 rounded-lg border border-border bg-surface px-3 outline-none focus:border-primary" defaultValue={initialRubricId ?? ""} name="rubric_id">
                <option value="">Ко всему каналу — рекомендуется</option>
                {rubrics.map((rubric) => <option key={rubric.id} value={rubric.id}>Только к рубрике «{rubric.name}»</option>)}
              </select>
            </label>
          </div>
        </details>

        {result ? (
          <div className="grid gap-3 rounded-xl border border-success/45 bg-[color-mix(in_srgb,var(--success),transparent_92%)] p-4" role="status">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <CheckCircle2 className="text-success" size={20} />
              {result.imported ? "Новые примеры добавлены" : "Эти посты уже были в подборке"}
            </div>
            <p className="text-sm leading-6 text-muted">Новых: {result.imported}. Совпадений: {result.duplicates}. Новые примеры сразу одобрены; статус найденных совпадений не менялся.</p>
            <Button asChild className="justify-self-start"><Link href={`/app/content/new?project=${projectId}`}><Mic size={16} />Надиктовать первый пост</Link></Button>
          </div>
        ) : null}

        {disabledReason ? <p className="rounded-lg border border-warning/45 bg-[color-mix(in_srgb,var(--warning),transparent_94%)] p-3 text-sm leading-6 text-muted">{disabledReason}</p> : null}
        {error ? <div className="rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm text-danger" role="alert">{error}</div> : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button className="min-h-11" disabled={isSubmitting || selectedCount === 0 || Boolean(disabledReason)} type="submit">
            {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Сохранить {selectedCount ? `${selectedCount} ${russianCountLabel(selectedCount, "пост", "поста", "постов")}` : "подборку"}
          </Button>
          <span className="text-xs leading-5 text-muted">Новые посты сразу становятся одобренными примерами; найденные совпадения сохраняют прежний статус.</span>
        </div>
        </fieldset>
      </form>
    </Card>
  );
}
