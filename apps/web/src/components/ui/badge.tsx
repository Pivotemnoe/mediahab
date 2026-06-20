import { type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "info" | "neutral" | "success" | "warning" | "danger";
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-1 text-xs font-medium",
        tone === "neutral" && "border border-border bg-surface text-muted",
        tone === "info" && "border border-border bg-surface-muted text-foreground",
        tone === "success" && "bg-[color-mix(in_srgb,var(--success),transparent_88%)] text-success",
        tone === "warning" && "bg-[color-mix(in_srgb,var(--warning),transparent_88%)] text-warning",
        tone === "danger" && "bg-[color-mix(in_srgb,var(--danger),transparent_88%)] text-danger",
        className,
      )}
      {...props}
    />
  );
}
