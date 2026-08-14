"use client";

import { Bold, Italic, Link2, Redo2, Undo2, Unlink } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  type RichTextDocument,
  richTextFromElement,
  richTextHtml,
} from "@/lib/rich-text";

export function RichTextEditor({
  ariaLabel,
  minHeightClass = "min-h-64",
  onChange,
  value,
}: {
  ariaLabel: string;
  minHeightClass?: string;
  onChange: (value: RichTextDocument) => void;
  value: RichTextDocument;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const serialized = JSON.stringify(value);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const html = richTextHtml(value);
    if (editor.innerHTML !== html) editor.innerHTML = html;
  }, [serialized, value]);

  function emitChange() {
    if (editorRef.current) onChange(richTextFromElement(editorRef.current));
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) selectionRef.current = range.cloneRange();
  }

  function restoreSelection() {
    const range = selectionRef.current;
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function command(name: string, argument?: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(name, false, argument);
    rememberSelection();
    emitChange();
  }

  function openLinkEditor() {
    rememberSelection();
    const selected = window.getSelection()?.toString() ?? "";
    if (!selected.trim()) return;
    setLinkUrl("");
    setLinkOpen(true);
  }

  function applyLink() {
    try {
      const parsed = new URL(linkUrl.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      command("createLink", parsed.toString());
      setLinkOpen(false);
      setLinkUrl("");
    } catch {
      setLinkUrl(linkUrl.trim());
    }
  }

  const toolbarButton = (label: string, icon: ReactNode, action: () => void) => (
    <Button aria-label={label} size="sm" type="button" variant="secondary" onMouseDown={(event) => event.preventDefault()} onClick={action}>
      {icon}
    </Button>
  );

  return (
    <div className="grid min-w-0 gap-2">
      <div aria-label="Форматирование" className="flex min-w-0 flex-wrap gap-2" role="toolbar">
        {toolbarButton("Жирный", <Bold size={16} />, () => command("bold"))}
        {toolbarButton("Курсив", <Italic size={16} />, () => command("italic"))}
        {toolbarButton("Добавить ссылку", <Link2 size={16} />, openLinkEditor)}
        {toolbarButton("Удалить ссылку", <Unlink size={16} />, () => command("unlink"))}
        {toolbarButton("Отменить", <Undo2 size={16} />, () => command("undo"))}
        {toolbarButton("Повторить", <Redo2 size={16} />, () => command("redo"))}
      </div>
      {linkOpen ? (
        <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-surface-muted p-3 sm:flex-row">
          <label className="grid min-w-0 flex-1 gap-1 text-xs text-muted">
            Ссылка для выделенной фразы
            <input
              autoFocus
              className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              inputMode="url"
              placeholder="https://..."
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.currentTarget.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyLink(); } }}
            />
          </label>
          <div className="flex items-end gap-2">
            <Button disabled={!linkUrl.trim()} size="sm" type="button" onClick={applyLink}>Применить</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => setLinkOpen(false)}>Отмена</Button>
          </div>
        </div>
      ) : null}
      <div
        aria-label={ariaLabel}
        className={`${minHeightClass} w-full overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-primary bg-background p-4 text-sm leading-6 text-foreground outline-none focus:ring-2 focus:ring-primary/20 [&_a]:text-primary [&_a]:underline`}
        contentEditable
        data-testid="rich-text-editor"
        ref={editorRef}
        role="textbox"
        spellCheck
        suppressContentEditableWarning
        onBlur={emitChange}
        onInput={emitChange}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
      />
      <p className="text-xs leading-5 text-muted">Выдели слово или фразу, затем нажми кнопку ссылки. Можно добавлять обычные ссылки на сайты.</p>
    </div>
  );
}

export function RichTextPreview({ value }: { value: RichTextDocument }) {
  return (
    <div
      className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground [&_a]:text-primary [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: richTextHtml(value) }}
    />
  );
}
