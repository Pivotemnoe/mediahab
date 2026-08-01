"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PlatformVariantFeedbackOut,
  PlatformVariantFeedbackResponse,
} from "@/services/openapi-types";

function csrfToken(): string | null {
  const row = document.cookie.split("; ").find((cookie) => cookie.startsWith("tmh_csrf="));
  return row ? decodeURIComponent(row.slice("tmh_csrf=".length)) : null;
}

async function request<T>(path: string, method: "DELETE" | "GET" | "PUT", body?: unknown): Promise<T> {
  const token = csrfToken();
  const response = await fetch(path, {
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { "X-CSRF-Token": token } : {}),
    },
    method,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message || `Ошибка сервера ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export function PlatformFeedbackControls({ platformLabel, variantId }: { platformLabel: string; variantId: string }) {
  const [feedback, setFeedback] = useState<PlatformVariantFeedbackOut | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void request<PlatformVariantFeedbackResponse>(`/api/v1/platform-variants/${variantId}/feedback`, "GET")
      .then((response) => { if (!cancelled) setFeedback(response.feedback); })
      .catch(() => { if (!cancelled) setMessage("Реакция сейчас не загрузилась."); });
    return () => { cancelled = true; };
  }, [variantId]);

  async function react(reaction: PlatformVariantFeedbackOut["reaction"], learnStyle = false) {
    try {
      const response = await request<PlatformVariantFeedbackResponse>(
        `/api/v1/platform-variants/${variantId}/feedback`,
        "PUT",
        { learn_style: learnStyle, reaction, version: feedback?.version ?? null },
      );
      setFeedback(response.feedback);
      setMessage(learnStyle ? "Внутренний пример стиля сохранён. OpenAI не обучается." : "Реакция сохранена для этой площадки.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить реакцию.");
    }
  }

  async function clear() {
    try {
      await request<PlatformVariantFeedbackResponse>(`/api/v1/platform-variants/${variantId}/feedback`, "DELETE");
      setFeedback(null);
      setMessage("Реакция снята; внутренний пример отключён.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось снять реакцию.");
    }
  }

  return (
    <section className="grid min-w-0 gap-2 rounded-lg border border-border bg-surface-muted p-3" data-testid="saved-platform-feedback">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Оценка версии {platformLabel}</h3>
          <p className="mt-1 text-xs leading-5 text-muted">Отдельно для этой площадки. Стиль запоминается только после ручной правки.</p>
        </div>
        {feedback ? <Badge tone={feedback.reaction === "excellent" ? "success" : feedback.reaction === "good" ? "info" : "warning"}>{feedback.learns_style ? "стиль запомнен" : "сохранено"}</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void react("excellent", true)} size="sm" variant={feedback?.reaction === "excellent" ? "primary" : "secondary"}>Отлично · запомнить</Button>
        <Button onClick={() => void react("good")} size="sm" variant={feedback?.reaction === "good" ? "primary" : "secondary"}>Хорошо</Button>
        <Button onClick={() => void react("needs_work")} size="sm" variant={feedback?.reaction === "needs_work" ? "primary" : "secondary"}>Нужна правка</Button>
        <Button onClick={() => void react("not_my_style")} size="sm" variant={feedback?.reaction === "not_my_style" ? "primary" : "secondary"}>Не мой стиль</Button>
        {feedback ? <Button onClick={() => void clear()} size="sm" variant="ghost">Снять</Button> : null}
      </div>
      {message ? <p aria-live="polite" className="text-xs leading-5 text-muted">{message}</p> : null}
    </section>
  );
}
