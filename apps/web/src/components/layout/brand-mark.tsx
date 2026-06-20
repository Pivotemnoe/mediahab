import Link from "next/link";

import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  inverted?: boolean;
};

export function BrandMark({ compact, href = "/", inverted }: BrandMarkProps) {
  return (
    <Link className="inline-flex items-center gap-3" href={href}>
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground",
          inverted && "bg-sidebar-foreground text-sidebar",
        )}
      >
        {brand.logoMark}
      </span>
      {!compact ? (
        <span className="grid gap-0.5">
          <span className="text-sm font-semibold leading-none">{brand.fullName}</span>
          <span className={cn("text-xs leading-none text-muted", inverted && "text-sidebar-foreground/60")}>
            {brand.tagline}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
