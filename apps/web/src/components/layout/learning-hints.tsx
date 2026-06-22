"use client";

import { HelpCircle, X } from "lucide-react";
import { type ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type LearningHint = {
  body: string;
  title: string;
};

type LearningHintsProps = {
  className?: string;
  hints: LearningHint[];
  storageKey: string;
  title?: string;
};

export function LearningHints({
  className,
  hints,
  storageKey,
  title = "Подсказки",
}: LearningHintsProps) {
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEnabled(window.localStorage.getItem(storageKey) !== "off");
    setReady(true);
  }, [storageKey]);

  function toggleHints(nextEnabled: boolean) {
    setEnabled(nextEnabled);
    window.localStorage.setItem(storageKey, nextEnabled ? "on" : "off");
  }

  if (!ready) {
    return null;
  }

  return (
    <Card className={cn("grid gap-3 border-primary/30 bg-[color-mix(in_srgb,var(--primary),transparent_94%)]", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <HelpCircle className="shrink-0 text-primary" size={18} />
          <span>{title}</span>
        </div>
        <Button
          aria-pressed={enabled}
          onClick={() => toggleHints(!enabled)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {enabled ? "Отключить" : "Включить"}
        </Button>
      </div>
      {enabled ? (
        <div className="grid gap-2">
          {hints.map((hint) => (
            <div className="rounded-md border border-border bg-background p-3 text-sm" key={hint.title}>
              <div className="font-medium text-foreground">{hint.title}</div>
              <div className="mt-1 leading-5 text-muted">{hint.body}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-border bg-background p-3 text-sm leading-5 text-muted">
          <X className="shrink-0" size={16} />
          Подсказки скрыты на этом устройстве. Их можно включить снова этой кнопкой.
        </div>
      )}
    </Card>
  );
}

type HintPopoverProps = {
  body: ReactNode;
  className?: string;
  storageKey: string;
  title: string;
};

export function HintPopover({
  body,
  className,
  storageKey,
  title,
}: HintPopoverProps) {
  const [enabled, setEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEnabled(window.localStorage.getItem(storageKey) !== "off");
    setReady(true);
  }, [storageKey]);

  if (!ready || !enabled) {
    return null;
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        aria-expanded={open}
        aria-label={`Подсказка: ${title}`}
        className="inline-flex size-7 items-center justify-center rounded-full border border-primary/30 bg-[color-mix(in_srgb,var(--primary),transparent_90%)] text-primary"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <HelpCircle size={15} />
      </button>
      {open ? (
        <span className="absolute right-0 top-9 z-40 grid w-[min(280px,calc(100vw-2rem))] gap-1 rounded-md border border-border bg-background p-3 text-left text-sm shadow-panel">
          <span className="font-medium text-foreground">{title}</span>
          <span className="leading-5 text-muted">{body}</span>
        </span>
      ) : null}
    </span>
  );
}
