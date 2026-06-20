"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/layout/brand-mark";
import { UsageMeter } from "@/components/ui/usage-meter";
import { cabinetNavItems } from "@/config/navigation";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string) {
  if (href === "/app/dashboard") {
    return pathname === "/app" || pathname === "/app/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-sidebar bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="border-b border-white/10 p-5">
        <BrandMark href="/app" inverted />
      </div>
      <div className="grid gap-6 p-4">
        <div>
          <div className="px-2 text-[11px] font-medium uppercase text-sidebar-foreground/45">
            Продукт
          </div>
          <nav className="mt-3 grid gap-1">
            {cabinetNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
                    active
                      ? "bg-white/10 text-white"
                      : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <UsageMeter
            label="Тариф Pro"
            labelClassName="text-sidebar-foreground/60"
            max={100}
            tone="warning"
            trackClassName="bg-white/15"
            value={62}
            valueClassName="text-sidebar-foreground"
          />
        </div>
      </div>
    </aside>
  );
}
