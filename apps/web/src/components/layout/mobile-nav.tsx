"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";

import { mobileNavItems } from "@/config/navigation";
import { cn } from "@/lib/cn";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid box-border grid-cols-5 border-t border-border bg-surface/95 px-2 py-2 backdrop-blur lg:hidden">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.href === "/app/dashboard" && pathname === "/app");
        return (
          <Link
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] transition",
              active ? "bg-surface-muted text-foreground" : "text-muted",
            )}
            href={item.href}
            key={item.href}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <Link
        className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] text-muted"
        href="/app/settings"
      >
        <MoreHorizontal size={18} />
        <span>Ещё</span>
      </Link>
    </nav>
  );
}
