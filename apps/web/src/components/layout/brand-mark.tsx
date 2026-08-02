import Link from "next/link";

import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  inverted?: boolean;
};

export function BrandMark({ compact, href = "/", inverted }: BrandMarkProps) {
  const hasHubSuffix = brand.productName.toLowerCase().endsWith("hub");
  const namePrefix = hasHubSuffix ? brand.productName.slice(0, -3) : brand.productName;
  const nameAccent = hasHubSuffix ? brand.productName.slice(-3) : "";

  return (
    <Link className="inline-flex min-h-10 items-center gap-3" href={href}>
      {!compact ? (
        <span className="grid gap-1">
          <span className={cn("text-xl font-semibold leading-none tracking-[-0.04em] text-foreground", inverted && "text-sidebar-foreground")}>
            {namePrefix}<span className="text-success">{nameAccent}</span>
          </span>
          <span className={cn("hidden text-[10px] uppercase tracking-[0.18em] text-muted sm:block", inverted && "text-sidebar-foreground/55")}>
            голос · стиль · площадки
          </span>
        </span>
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface text-xs font-bold text-success">
          {brand.logoMark}
        </span>
      )}
    </Link>
  );
}
