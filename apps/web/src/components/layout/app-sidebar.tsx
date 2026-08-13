"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, LogOut, MoreHorizontal, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/layout/brand-mark";
import { cabinetMoreItems, cabinetNavItems } from "@/config/navigation";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app" || pathname === "/app/dashboard";
  if (href === "/app/content") return pathname === href || pathname.startsWith("/app/content/") && pathname !== "/app/content/new";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const moreActive = cabinetMoreItems.some((item) => isActive(pathname, item.href));

  return (
    <aside className="sticky top-0 hidden h-screen w-[176px] shrink-0 flex-col border-r border-border bg-sidebar px-3 py-5 lg:flex" data-testid="app-sidebar">
      <div className="px-2">
        <BrandMark href="/app" showTagline={false} />
      </div>

      <nav className="mt-10 grid gap-2" aria-label="Главное меню">
        {cabinetNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-12 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition duration-200",
                active
                  ? "border-success bg-[color-mix(in_srgb,var(--success),transparent_88%)] text-foreground shadow-panel"
                  : "border-transparent text-muted hover:-translate-y-0.5 hover:border-border hover:bg-surface hover:text-foreground",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className={active ? "text-success" : "text-muted group-hover:text-primary"} size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative mt-auto">
        {moreOpen ? (
          <section className="absolute bottom-14 left-0 z-40 grid w-[292px] gap-2 rounded-xl border border-border bg-surface p-3 shadow-popover" data-testid="sidebar-more-menu">
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Всё остальное</div>
            <div className="grid grid-cols-2 gap-1">
              {cabinetMoreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-xs transition hover:bg-surface-muted hover:text-foreground",
                      active ? "bg-surface-muted text-foreground" : "text-muted",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className={active ? "text-success" : "text-primary"} size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-border pt-2 text-xs leading-5 text-muted">
              Начните с «Идеи», «Создать» или «Блокнот» — остальное можно настроить позже.
            </div>
          </section>
        ) : null}

        <button
          aria-expanded={moreOpen}
          className={cn(
            "flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition",
            moreOpen || moreActive ? "border-border bg-surface text-foreground" : "border-transparent text-muted hover:border-border hover:bg-surface",
          )}
          data-testid="sidebar-more-open"
          onClick={() => setMoreOpen((current) => !current)}
          type="button"
        >
          <span className="flex items-center gap-3"><MoreHorizontal size={18} />Ещё</span>
          <ChevronUp className={cn("transition", moreOpen ? "rotate-180" : "")} size={15} />
        </button>

        <div className="mt-3 flex items-center justify-between border-t border-border px-2 pt-4">
          <Link className="flex min-w-0 items-center gap-2 text-xs text-muted hover:text-foreground" href="/app/account">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-success"><UserRound size={15} /></span>
            <span className="truncate">Мой кабинет</span>
          </Link>
          <Link aria-label="Выйти" className="rounded-md p-2 text-muted hover:bg-surface hover:text-foreground" href="/login"><LogOut size={16} /></Link>
        </div>
      </div>
    </aside>
  );
}
