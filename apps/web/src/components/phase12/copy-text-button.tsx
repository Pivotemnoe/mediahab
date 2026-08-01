"use client";

import { Check, Clipboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { type RichTextDocument, copyRichText, plainRichText } from "@/lib/rich-text";

export function CopyTextButton({ label, richText, text }: { label: string; richText?: RichTextDocument; text: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function copyText() {
    if (!text) return;
    await copyRichText(richText ?? plainRichText(text));
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button
      aria-label={`Копировать готовую версию для ${label}`}
      data-testid="saved-variant-copy"
      size="sm"
      type="button"
      variant="secondary"
      onClick={() => void copyText()}
    >
      {copied ? <Check size={15} /> : <Clipboard size={15} />}
      {copied ? "Скопировано" : "Копировать"}
    </Button>
  );
}
