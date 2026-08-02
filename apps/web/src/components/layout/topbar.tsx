import Link from "next/link";

import { BrandMark } from "@/components/layout/brand-mark";
import { QuickCreatePalette } from "@/components/layout/quick-create-palette";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-sidebar lg:hidden">
      <div className="mx-auto flex min-h-16 items-center justify-between gap-3 px-4 sm:px-5">
        <BrandMark href="/app" />
        <div className="flex items-center justify-end gap-2">
          <QuickCreatePalette />
          <Link
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold text-success"
            href="/app/account"
          >
            КТ
          </Link>
        </div>
      </div>
    </header>
  );
}
