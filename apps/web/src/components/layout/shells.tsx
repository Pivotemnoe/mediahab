import { type ReactNode } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";
import { OfflineStatus } from "@/components/pwa/offline-status";
import { Button } from "@/components/ui/button";
import { marketingNavItems } from "@/config/navigation";
import { cn } from "@/lib/cn";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
          <BrandMark />
          <nav className="hidden items-center gap-1 lg:flex">
            {marketingNavItems.map((item) => (
              <Button asChild key={item.href} variant="ghost">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
          <div className="flex gap-2">
            <Button asChild className="hidden border-transparent bg-transparent sm:inline-flex" variant="secondary">
              <Link href="/login">Войти</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Начать с диктовки</Link>
            </Button>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-border bg-sidebar">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-9 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-12">
          <div>
            <BrandMark />
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">Одна идея превращается в отдельные версии для каждой площадки. Последнее слово всегда остаётся за вами.</p>
          </div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-muted sm:grid-cols-4" aria-label="Нижнее меню">
            <Link className="hover:text-foreground" href="/features">Возможности</Link>
            <Link className="hover:text-foreground" href="/pricing">Тарифы</Link>
            <Link className="hover:text-foreground" href="/security">Безопасность</Link>
            <Link className="hover:text-foreground" href="/contacts">Контакты</Link>
            <Link className="hover:text-foreground" href="/privacy">Приватность</Link>
            <Link className="hover:text-foreground" href="/terms">Условия</Link>
            <Link className="hover:text-foreground" href="/login">Войти</Link>
            <Link className="text-primary hover:text-foreground" href="/register">Начать</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

export function AuthShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-[1440px] items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-12">
        <section className="py-2 lg:py-8 lg:pr-12">
          <BrandMark />
          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-success lg:mt-12">Один исходник — разные площадки</div>
          <p className="mt-3 text-sm leading-6 text-muted lg:hidden">Из диктовки — в отдельные версии для Telegram, MAX, VK и Instagram.</p>
          <h1 className="font-editorial mt-4 hidden max-w-3xl text-7xl leading-[0.98] text-foreground lg:block">
            Вернитесь к своему голосу и готовым постам.
          </h1>
          <p className="mt-6 hidden max-w-xl text-lg leading-7 text-muted lg:block">
            Надиктуйте факты, проверьте расшифровку и получите отдельные версии для Telegram, MAX, VK и Instagram — без автопубликации.
          </p>
          <div className="mt-8 hidden max-w-2xl gap-3 lg:grid lg:grid-cols-3">
            {["Факты остаются вашими", "Правила хранятся в проекте", "Вы подтверждаете результат"].map((item) => (
              <div className="rounded-lg border border-border bg-surface p-3 text-sm leading-5 text-muted" key={item}>{item}</div>
            ))}
          </div>
        </section>
        <section className={cn("rounded-xl border border-border bg-surface p-5 shadow-popover sm:p-7", className)}>
          {children}
        </section>
      </div>
    </main>
  );
}

export function CabinetShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main className="box-border mx-auto w-full max-w-[1600px] px-4 pb-24 pt-5 sm:px-5 lg:px-7 lg:pb-10 lg:pt-7 xl:px-9">
          {children}
        </main>
      </div>
      <MobileNav />
      <OfflineStatus />
    </div>
  );
}
