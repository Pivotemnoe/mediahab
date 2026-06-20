import { type ReactNode } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { OfflineStatus } from "@/components/pwa/offline-status";
import { Button } from "@/components/ui/button";
import { marketingNavItems } from "@/config/navigation";
import { cn } from "@/lib/cn";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <BrandMark />
          <nav className="hidden items-center gap-2 md:flex">
            {marketingNavItems.map((item) => (
              <Button asChild key={item.href} variant="ghost">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/login">Войти</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Начать</Link>
            </Button>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}

export function AuthShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-4 py-8 lg:grid-cols-[1fr_440px]">
        <section>
          <BrandMark />
          <h1 className="mt-8 max-w-2xl text-4xl font-semibold leading-tight text-foreground">
            Из диктовки в готовый пост для каждой площадки.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            Настройте проект, соберите факты, проверьте ИИ-редактуру и подготовьте версии для Telegram, MAX и Instagram.
          </p>
        </section>
        <section className={cn("rounded-lg border border-border bg-surface p-4 shadow-panel", className)}>
          {children}
        </section>
      </div>
    </main>
  );
}

export function CabinetShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground lg:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 overflow-x-hidden">
        <Topbar />
        <main className="box-border mx-auto w-full max-w-full px-4 pb-24 pt-4 lg:max-w-[1500px] lg:px-6 lg:pb-8">
          {children}
        </main>
      </div>
      <OfflineStatus />
      <MobileNav />
    </div>
  );
}
