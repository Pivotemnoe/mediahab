"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  FileText,
  Mic,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const actions = [
  {
    description: "Начать новую публикацию голосом.",
    href: "/app/content/new",
    icon: Mic,
    title: "Наговорить публикацию",
  },
  {
    description: "Вставить готовый текст и подготовить его для площадок.",
    href: "/app/content/new?input=text",
    icon: FileText,
    title: "Вставить готовый текст",
  },
  {
    description: "Добавить повторяющийся формат для канала.",
    href: "/app/projects",
    icon: BookOpenCheck,
    title: "Добавить формат",
  },
];

export function QuickCreatePalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        data-testid="quick-create-open"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
      >
        <Plus size={16} />
        Наговорить
      </Button>

      {open ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-start bg-black/65 px-3 py-14 sm:px-6 md:py-24"
          data-testid="quick-create-palette"
          role="dialog"
        >
          <div className="mx-auto grid w-full max-w-2xl gap-3 rounded-lg border border-border bg-surface p-3 shadow-popover">
            <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
              <Search className="shrink-0 text-muted" size={18} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">С чего начать?</div>
                <div className="truncate text-xs text-muted">Голос, готовый текст или новый формат</div>
              </div>
              <Button
                aria-label="Закрыть быстрые действия"
                onClick={() => setOpen(false)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="grid gap-2">
              {actions.map(({ description, href, icon: Icon, title }) => (
                <Link
                  className="grid grid-cols-[40px_1fr] gap-3 rounded-md border border-transparent p-3 transition hover:border-border hover:bg-surface-muted"
                  href={href}
                  key={title}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary),transparent_88%)] text-primary">
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="rounded-md bg-surface-muted px-3 py-2 text-xs leading-5 text-muted">
              Здесь ничего не публикуется. Перед отправкой ты всё проверишь.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
