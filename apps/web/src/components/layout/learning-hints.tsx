"use client";

import { HelpCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type LearningHint = {
  body: string;
  title: string;
};

type LearningHintsProps = {
  hints: LearningHint[];
  storageKey: string;
  title?: string;
};

export function LearningHints({
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
    <Card className="grid gap-3 border-primary/30 bg-[color-mix(in_srgb,var(--primary),transparent_94%)]">
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
