"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mobileNavItems } from "@/config/navigation";
import { cn } from "@/lib/cn";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Главное меню"
      className="fixed inset-x-0 bottom-0 z-30 grid box-border border-t border-border bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      style={{ gridTemplateColumns: `repeat(${mobileNavItems.length}, minmax(0, 1fr))` }}
    >
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/app"
          ? pathname === "/app" || pathname === "/app/dashboard"
          : item.href === "/app/content"
            ? pathname === item.href || pathname.startsWith("/app/content/") && pathname !== "/app/content/new"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[11px] transition",
              active ? "bg-surface-muted text-foreground" : "text-muted",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon size={18} />
            <span className="max-w-full truncate px-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
