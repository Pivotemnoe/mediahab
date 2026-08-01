import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";
import { QuickCreatePalette } from "@/components/layout/quick-create-palette";
import { Button } from "@/components/ui/button";

const appLinks = [
  { href: "/app", label: "Кабинет" },
  { href: "/app/content/new", label: "Создать" },
  { href: "/app/content", label: "История" },
  { href: "/app/notebook", label: "Блокнот" },
  { href: "/app/projects", label: "Проекты" },
];

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark href="/app" />
          <nav className="hidden items-center gap-1 xl:flex">
            {appLinks.map((item) => (
              <Button asChild key={item.href} size="sm" variant="ghost">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
        </div>
        <div className="flex items-center justify-end gap-2">
          <QuickCreatePalette />
          <Link
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            href="/app/account"
          >
            КТ
          </Link>
        </div>
      </div>
    </header>
  );
}
