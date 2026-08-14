"use client";

import { Mic, NotebookPen, Palette, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export const FIRST_RUN_TOUR_STORAGE_KEY = "nagovori:first-run-tour:v1";
export const FIRST_RUN_TOUR_OPEN_EVENT = "nagovori:first-run-tour:open";

const steps = [
  {
    body: "Сначала создай канал. Затем открой «Наговорить», нажми микрофон и расскажи свою мысль — или вставь готовый текст.",
    icon: Mic,
    title: "Наговорить публикацию",
  },
  {
    body: "В «Блокноте» можно сохранить мысль за несколько секунд. Канал и площадку выберешь позже.",
    icon: NotebookPen,
    title: "Не потерять мысль",
  },
  {
    body: "Добавь в «Мой стиль» публикации, подача которых тебе нравится. «Наговори» возьмёт из них ритм и тон, но не чужие факты.",
    icon: Palette,
    title: "Показать свой стиль",
  },
] as const;

export function FirstRunTour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const finish = useCallback((result: "completed" | "skipped") => {
    try {
      window.localStorage.setItem(FIRST_RUN_TOUR_STORAGE_KEY, result);
    } catch {
      // The tour still closes when browser storage is unavailable.
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    function showTour() {
      setStepIndex(0);
      setOpen(true);
    }

    try {
      if (!window.localStorage.getItem(FIRST_RUN_TOUR_STORAGE_KEY)) showTour();
    } catch {
      showTour();
    }

    window.addEventListener(FIRST_RUN_TOUR_OPEN_EVENT, showTour);
    return () => window.removeEventListener(FIRST_RUN_TOUR_OPEN_EVENT, showTour);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") finish("skipped");
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [finish, open]);

  if (!open) return null;

  const step = steps[stepIndex];
  const Icon = step.icon;
  const lastStep = stepIndex === steps.length - 1;

  return (
    <div
      aria-labelledby="first-run-tour-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-3 sm:place-items-center sm:p-6"
      data-testid="first-run-tour"
      role="dialog"
    >
      <section className="grid w-full max-w-lg gap-5 rounded-2xl border border-border bg-surface p-5 shadow-popover sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-success">
              Быстрое знакомство · шаг {stepIndex + 1} из {steps.length}
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-foreground" id="first-run-tour-title">
              Три шага — и можно начинать
            </h2>
          </div>
          <button
            aria-label="Пропустить обучение"
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-foreground"
            onClick={() => finish("skipped")}
            ref={closeButtonRef}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 rounded-xl border border-primary/40 bg-[color-mix(in_srgb,var(--primary),transparent_94%)] p-5">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Icon size={24} />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
          </div>
        </div>

        <div className="flex items-center gap-2" aria-label="Ход обучения">
          {steps.map((item, index) => (
            <span
              aria-label={`${item.title}: ${index === stepIndex ? "текущий шаг" : index < stepIndex ? "пройден" : "впереди"}`}
              className={index <= stepIndex ? "h-1.5 flex-1 rounded-full bg-primary" : "h-1.5 flex-1 rounded-full bg-surface-muted"}
              key={item.title}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={() => finish("skipped")} type="button" variant="ghost">
            Пропустить
          </Button>
          <div className="flex gap-2">
            {stepIndex > 0 ? (
              <Button onClick={() => setStepIndex((current) => current - 1)} type="button" variant="secondary">
                Назад
              </Button>
            ) : null}
            <Button
              onClick={() => lastStep ? finish("completed") : setStepIndex((current) => current + 1)}
              type="button"
            >
              {lastStep ? "Попробовать" : "Далее"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
