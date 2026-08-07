import Link from "next/link";

import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  compact?: boolean;
  href?: string;
  inverted?: boolean;
  showTagline?: boolean;
};

export function BrandMark({ compact, href = "/", inverted, showTagline = true }: BrandMarkProps) {
  return (
    <Link className="inline-flex min-h-10 items-center gap-3" href={href}>
      <img
        alt=""
        aria-hidden="true"
        className={cn(compact ? "h-10 w-10" : "h-10 w-14", "shrink-0 object-contain")}
        src={brand.logoUrl}
      />
      {!compact ? (
        <span className="grid min-w-0 gap-1">
          <span className={cn("whitespace-nowrap text-lg font-semibold leading-none tracking-[-0.04em] text-foreground", inverted && "text-sidebar-foreground")}>
            {brand.productName}
          </span>
          {showTagline ? <span className={cn("hidden max-w-56 text-[9px] font-medium leading-tight text-muted sm:block", inverted && "text-sidebar-foreground/55")}>
            {brand.tagline}
          </span> : null}
        </span>
      ) : null}
    </Link>
  );
}
