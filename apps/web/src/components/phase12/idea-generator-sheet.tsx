"use client";

import { Check, ChevronDown, Lightbulb, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IdeaBriefViewModel } from "@/services/content";
import type { BlockOut, ContentItemOut, IdeaCapabilityOut } from "@/services/openapi-types";

type IdeaGoal = "engage" | "explain" | "open" | "share_experience" | "soft_sell";

type IdeaApiSuggestion = {
  angle: string;
  detail_questions: [string, string, string];
  id: string;
  idea_brief: string;
  starter_outline: string;
  title: string;
};

type IdeaGenerationResponse = {
  error_code: string | null;
  error_message: string | null;
  id: string;
  response_json: {
    ideas: IdeaApiSuggestion[];
    warnings?: string[];
  } | null;
  status: string;
};

export type IdeaAcceptedResult = {
  content_item: ContentItemOut;
  idea: IdeaBriefViewModel;
  idea_brief: BlockOut;
};

type IdeaAcceptApiResponse = {
  content_item: ContentItemOut;
  idea: IdeaApiSuggestion;
  idea_brief: BlockOut;
};

const goals: Array<{ label: string; value: IdeaGoal }> = [
  { label: "Без цели", value: "open" },
  { label: "Вовлечь", value: "engage" },
  { label: "Объяснить", value: "explain" },
  { label: "Поделиться опытом", value: "share_experience" },
  { label: "Продать мягко", value: "soft_sell" },
];

const ideaErrorMessages: Record<string, string> = {
  ai_text_generation_not_included: "Генерация идей не входит в текущий тариф.",
  client_content_id_conflict: "Не удалось открыть заготовку. Обновите страницу и попробуйте ещё раз.",
  duplicate_ideas: "Идеи получились слишком похожими. Запустите ещё одну подборку.",
  idea_already_accepted: "Одна из идей этой подборки уже сохранена в черновики.",
  idea_copies_example: "Ответ слишком близко повторил удачный пост. Запустите ещё одну подборку.",
  idea_daily_limit_reached: "Подборки на сегодня закончились. Новые будут доступны завтра.",
  idea_generator_unavailable: "Генератор идей сейчас недоступен для этого проекта.",
  limit_exceeded: "Месячный лимит ИИ-генераций исчерпан. Лимит обновится в новом расчётном периоде.",
  idea_repeats_recent_topic: "Получились темы, слишком похожие на недавние публикации. Уточните новый ракурс и попробуйте ещё раз.",
  project_not_found: "Проект больше недоступен. Обновите страницу.",
  role_denied: "Ваша роль в проекте не позволяет создавать материалы. Обратитесь к владельцу пространства.",
  rubric_not_found: "Выбранная рубрика больше недоступна. Обновите страницу.",
  subscription_inactive: "Для генерации идей нужна активная подписка.",
  unsupported_idea_claim: "В идеях появилось слишком категоричное утверждение. Уточните тему или попробуйте ещё раз.",
  unsupported_idea_quote: "В идеях появилась фраза, которую вы не давали. Мы её не используем — запустите ещё одну подборку.",
  unsafe_idea_output: "Ответ не прошёл проверку безопасности. Опишите тему немного иначе.",
  unsafe_idea_outline: "Вместо заготовки получился слишком готовый совет. Запустите ещё одну подборку.",
  unsupported_idea_specific: "В идеях появились детали, которых не было в описании. Добавьте нужные факты или попробуйте ещё раз.",
};

function friendlyIdeaError(code?: string | null, status?: number): string {
  if (code && ideaErrorMessages[code]) return ideaErrorMessages[code];
  if (status === 401 || status === 403) return "Сессия страницы устарела. Обновите страницу и войдите заново.";
  if (status === 429) return "Сейчас слишком много запросов. Подождите немного и попробуйте ещё раз.";
  return "Сейчас не удалось подобрать идеи. Попробуйте ещё раз чуть позже.";
}

function csrfToken(): string | null {
  const match = document.cookie.split("; ").find((cookie) => cookie.startsWith("tmh_csrf="));
  return match ? decodeURIComponent(match.slice("tmh_csrf=".length)) : null;
}

async function ideaApiRequest<T>(
  path: string,
  options: { body?: unknown; method: "GET" | "POST"; signal?: AbortSignal },
): Promise<T> {
  const token = csrfToken();
  if (options.method === "POST" && !token) {
    throw new Error("Сессия страницы устарела. Обновите страницу и войдите заново.");
  }
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("X-CSRF-Token", token);
  const response = await fetch(path, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers,
    method: options.method,
    signal: options.signal,
  });
  if (!response.ok) {
    let message = `Сервер вернул ошибку ${response.status}.`;
    try {
      const payload = await response.json() as { error?: { code?: string; message?: string } };
      message = friendlyIdeaError(payload.error?.code, response.status);
    } catch {
      message = friendlyIdeaError(null, response.status);
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === "AbortError";
}

function isApiIdea(value: unknown): value is IdeaApiSuggestion {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const idea = value as Record<string, unknown>;
  return typeof idea.id === "string"
    && typeof idea.title === "string"
    && Boolean(idea.title.trim())
    && typeof idea.angle === "string"
    && Boolean(idea.angle.trim())
    && typeof idea.idea_brief === "string"
    && Boolean(idea.idea_brief.trim())
    && typeof idea.starter_outline === "string"
    && Boolean(idea.starter_outline.trim())
    && Array.isArray(idea.detail_questions)
    && idea.detail_questions.length === 3
    && idea.detail_questions.every((question) => typeof question === "string" && question.trim());
}

function ideaViewModel(idea: IdeaApiSuggestion): IdeaBriefViewModel {
  return {
    angle: idea.angle,
    detailQuestions: [...idea.detail_questions],
    id: idea.id,
    ideaBrief: idea.idea_brief,
    starterOutline: idea.starter_outline,
    title: idea.title,
  };
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

export function IdeaGeneratorSheet({
  disabledReason,
  onAccepted,
  projectId,
  rubricId,
}: {
  disabledReason?: string;
  onAccepted: (result: IdeaAcceptedResult) => Promise<void> | void;
  projectId: string;
  rubricId: string | null;
}) {
  const [capability, setCapability] = useState<IdeaCapabilityOut | null>(null);
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState<IdeaGoal>("open");
  const [topic, setTopic] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<IdeaBriefViewModel[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [acceptingIdeaId, setAcceptingIdeaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const topicRef = useRef<HTMLTextAreaElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const clientContentIdsRef = useRef<Record<string, string>>({});
  const requestEpochRef = useRef(0);
  const capabilityAbortRef = useRef<AbortController | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const acceptAbortRef = useRef<AbortController | null>(null);
  const contextRef = useRef({ projectId, rubricId });
  contextRef.current = { projectId, rubricId };

  function invalidatePendingRequests(): number {
    requestEpochRef.current += 1;
    capabilityAbortRef.current?.abort();
    generateAbortRef.current?.abort();
    acceptAbortRef.current?.abort();
    capabilityAbortRef.current = null;
    generateAbortRef.current = null;
    acceptAbortRef.current = null;
    return requestEpochRef.current;
  }

  function requestIsCurrent(
    epoch: number,
    expected: { projectId: string; rubricId: string | null },
  ): boolean {
    const current = contextRef.current;
    return requestEpochRef.current === epoch
      && current.projectId === expected.projectId
      && current.rubricId === expected.rubricId;
  }

  function closeSheet() {
    invalidatePendingRequests();
    setOpen(false);
    setIsGenerating(false);
    setAcceptingIdeaId(null);
  }

  useEffect(() => {
    const expected = { projectId, rubricId };
    const epoch = invalidatePendingRequests();
    const controller = new AbortController();
    capabilityAbortRef.current = controller;
    setCapability(null);
    setOpen(false);
    setIdeas([]);
    setRunId(null);
    setError(null);
    setIsGenerating(false);
    setAcceptingIdeaId(null);
    void ideaApiRequest<IdeaCapabilityOut>(`/api/v1/projects/${projectId}/ideas/capability`, {
      method: "GET",
      signal: controller.signal,
    })
      .then((response) => {
        if (requestIsCurrent(epoch, expected) && !controller.signal.aborted) setCapability(response);
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause) || !requestIsCurrent(epoch, expected)) return;
        setCapability({ can_generate: false, daily_limit: 0, enabled: false, remaining_today: 0, used_today: 0 });
      })
      .finally(() => {
        if (capabilityAbortRef.current === controller) capabilityAbortRef.current = null;
      });
    return () => controller.abort();
  }, [projectId, rubricId]);

  useEffect(() => () => {
    invalidatePendingRequests();
  }, []);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => topicRef.current?.focus());
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const elements = focusableElements(dialogRef.current);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [open]);

  async function generateIdeas() {
    if (generateAbortRef.current || isGenerating || !capability?.can_generate || !capability.remaining_today) return;
    const expected = { projectId, rubricId };
    const epoch = requestEpochRef.current;
    const controller = new AbortController();
    generateAbortRef.current = controller;
    setIsGenerating(true);
    setError(null);
    setIdeas([]);
    try {
      const response = await ideaApiRequest<IdeaGenerationResponse>(`/api/v1/projects/${projectId}/ideas/generate`, {
        body: {
          goal,
          rubric_id: rubricId,
          topic: topic.trim() || null,
        },
        method: "POST",
        signal: controller.signal,
      });
      if (!requestIsCurrent(epoch, expected) || controller.signal.aborted) return;
      setCapability((current) => current ? {
        ...current,
        remaining_today: Math.max(0, current.remaining_today - 1),
        used_today: Math.min(current.daily_limit, current.used_today + 1),
      } : current);
      const responseIdeas = response.response_json?.ideas;
      if (response.status !== "completed" || !Array.isArray(responseIdeas) || responseIdeas.length !== 5 || !responseIdeas.every(isApiIdea)) {
        throw new Error(friendlyIdeaError(response.error_code));
      }
      setRunId(response.id);
      setIdeas(responseIdeas.map(ideaViewModel));
    } catch (cause) {
      if (isAbortError(cause) || !requestIsCurrent(epoch, expected)) return;
      setError(cause instanceof Error ? cause.message : "Не удалось подобрать идеи.");
    } finally {
      if (generateAbortRef.current === controller) generateAbortRef.current = null;
      if (requestIsCurrent(epoch, expected)) setIsGenerating(false);
    }
  }

  async function acceptIdea(idea: IdeaBriefViewModel) {
    if (!runId || acceptAbortRef.current || acceptingIdeaId || !capability?.can_generate) return;
    const expected = { projectId, rubricId };
    const epoch = requestEpochRef.current;
    const controller = new AbortController();
    acceptAbortRef.current = controller;
    setAcceptingIdeaId(idea.id);
    setError(null);
    const key = `${runId}:${idea.id}`;
    const clientContentId = clientContentIdsRef.current[key] ?? crypto.randomUUID();
    clientContentIdsRef.current[key] = clientContentId;
    try {
      const response = await ideaApiRequest<IdeaAcceptApiResponse>(`/api/v1/ai-runs/${runId}/ideas/${idea.id}/accept`, {
        body: { client_content_id: clientContentId },
        method: "POST",
        signal: controller.signal,
      });
      if (!requestIsCurrent(epoch, expected) || controller.signal.aborted) return;
      await onAccepted({ ...response, idea: ideaViewModel(response.idea) });
      if (!requestIsCurrent(epoch, expected) || controller.signal.aborted) return;
      closeSheet();
    } catch (cause) {
      if (isAbortError(cause) || !requestIsCurrent(epoch, expected)) return;
      setError(cause instanceof Error ? cause.message : "Не удалось взять идею. Попробуйте ещё раз.");
    } finally {
      if (acceptAbortRef.current === controller) acceptAbortRef.current = null;
      if (requestIsCurrent(epoch, expected)) setAcceptingIdeaId(null);
    }
  }

  if (!capability?.enabled || !capability.can_generate) return null;

  const quotaExhausted = capability.remaining_today <= 0;

  return (
    <>
      <div className="grid min-w-0 justify-items-center gap-1.5">
        <Button
          aria-describedby={disabledReason ? "idea-generator-disabled-reason" : undefined}
          className="min-h-11 w-full sm:w-auto"
          disabled={quotaExhausted || Boolean(disabledReason)}
          onClick={() => setOpen(true)}
          title={disabledReason || (quotaExhausted ? "Лимит идей на сегодня исчерпан" : undefined)}
          type="button"
          variant="secondary"
        >
          <Lightbulb size={17} />
          {quotaExhausted ? "Идеи на сегодня закончились" : "Помоги придумать"}
        </Button>
        {disabledReason ? (
          <p className="max-w-sm text-center text-xs leading-5 text-muted" id="idea-generator-disabled-reason">
            {disabledReason}
          </p>
        ) : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/65 sm:items-center sm:justify-center sm:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeSheet();
          }}
          role="presentation"
        >
          <section
            aria-describedby="idea-generator-description"
            aria-labelledby="idea-generator-title"
            aria-modal="true"
            className="grid max-h-[90dvh] w-full min-w-0 gap-4 overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 shadow-popover sm:max-w-3xl sm:rounded-2xl sm:p-6"
            data-testid="idea-generator-sheet"
            ref={dialogRef}
            role="dialog"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone="success">Идеи для постов</Badge>
                <h2 className="mt-3 text-2xl font-semibold text-foreground" id="idea-generator-title">О чём написать сегодня?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted" id="idea-generator-description">
                  Подберём пять разных заходов по теме проекта и выбранной рубрике. Идея станет заготовкой, а личные факты вы добавите голосом или текстом.
                </p>
              </div>
              <Button aria-label="Закрыть генератор идей" className="min-h-11 min-w-11" onClick={closeSheet} size="icon" type="button" variant="ghost"><X size={20} /></Button>
            </div>

            <div className="grid min-w-0 gap-4 rounded-xl border border-border bg-background p-4">
              <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-foreground" htmlFor="idea-generator-topic">
                Что сейчас хочется обсудить <span className="font-normal text-muted">(необязательно)</span>
                <textarea
                  className="min-h-24 min-w-0 resize-y rounded-lg border border-border bg-surface p-3 text-base font-normal leading-6 outline-none focus:border-primary"
                  id="idea-generator-topic"
                  maxLength={1000}
                  onChange={(event) => setTopic(event.currentTarget.value)}
                  placeholder="Например: появилась новая услуга, был интересный случай или хочется оживить канал"
                  ref={topicRef}
                  value={topic}
                />
              </label>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-semibold text-foreground">Что хочется получить?</legend>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {goals.map((item) => (
                    <button
                      aria-pressed={goal === item.value}
                      className={goal === item.value
                        ? "min-h-11 rounded-lg border border-success bg-[color-mix(in_srgb,var(--success),transparent_90%)] px-3 text-sm font-semibold text-foreground"
                        : "min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-muted hover:text-foreground"}
                      key={item.value}
                      onClick={() => setGoal(item.value)}
                      type="button"
                    >
                      {goal === item.value ? <Check className="mr-1 inline" size={14} /> : null}{item.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted">Осталось подборок сегодня: {capability.remaining_today} из {capability.daily_limit}</span>
                <Button className="min-h-11 w-full sm:w-auto" disabled={isGenerating || quotaExhausted} onClick={() => void generateIdeas()} type="button">
                  {isGenerating ? <Loader2 className="animate-spin motion-reduce:animate-none" size={17} /> : <Sparkles size={17} />}
                  {isGenerating ? "Подбираем 5 идей…" : ideas.length ? "Предложить другие 5" : "Предложить 5 идей"}
                </Button>
              </div>
            </div>

            <div aria-atomic="true" aria-live="polite" className="min-h-5 text-sm leading-6 text-muted">
              {isGenerating ? "Ищем разные темы в контексте проекта и удачных постах…" : ideas.length ? "Пять идей готовы. Выберите одну, чтобы продолжить в голосовой студии." : ""}
            </div>

            {error ? <div className="rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm leading-6 text-danger" role="alert">{error}</div> : null}

            {ideas.length === 5 ? (
              <div className="grid min-w-0 gap-3" data-testid="idea-generator-results">
                {ideas.map((idea, index) => (
                  <article className="grid min-w-0 gap-3 rounded-xl border border-border bg-background p-4" key={idea.id}>
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary),transparent_84%)] text-sm font-semibold text-primary">{index + 1}</span>
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-semibold text-foreground">{idea.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted">{idea.angle}</p>
                      </div>
                    </div>
                    <details className="group rounded-lg border border-border bg-surface-muted">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                        <span>Заготовка и вопросы</span><ChevronDown className="transition group-open:rotate-180 motion-reduce:transition-none" size={17} />
                      </summary>
                      <div className="grid gap-3 border-t border-border p-3">
                        <p className="text-sm leading-6 text-foreground">{idea.ideaBrief}</p>
                        <p className="text-xs leading-5 text-muted"><strong className="text-foreground">План:</strong> {idea.starterOutline}</p>
                        <ol className="grid gap-2 pl-5 text-sm leading-6 text-muted">
                          {idea.detailQuestions.map((question) => <li className="list-decimal" key={question}>{question}</li>)}
                        </ol>
                      </div>
                    </details>
                    <Button className="min-h-11 w-full sm:justify-self-start sm:w-auto" disabled={Boolean(acceptingIdeaId)} onClick={() => void acceptIdea(idea)} type="button">
                      {acceptingIdeaId === idea.id ? <Loader2 className="animate-spin motion-reduce:animate-none" size={17} /> : <Lightbulb size={17} />}
                      {acceptingIdeaId === idea.id ? "Сохраняем идею…" : "Взять идею"}
                    </Button>
                  </article>
                ))}
              </div>
            ) : null}

            {ideas.length ? (
              <Button className="min-h-11 justify-self-start" disabled={isGenerating || quotaExhausted} onClick={() => void generateIdeas()} type="button" variant="ghost">
                <RotateCcw size={16} />Не подошло — предложить другие 5
              </Button>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
