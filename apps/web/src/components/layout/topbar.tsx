import { HelpCircle, Plus, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm text-muted md:flex">
          <Search size={16} />
          <span className="truncate">Поиск по проектам, материалам и публикациям</span>
        </div>
        <div className="flex flex-1 items-center justify-between gap-2 md:justify-end">
          <Button asChild size="sm" variant="secondary">
            <Link href="/app/showcase">
              <HelpCircle size={16} />
              UI
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/app/content/new">
              <Plus size={16} />
              Создать
            </Link>
          </Button>
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
