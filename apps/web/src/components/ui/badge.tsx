import { type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger";
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-1 text-xs font-medium",
        tone === "neutral" && "bg-surface text-muted",
        tone === "success" && "bg-green-50 text-success",
        tone === "warning" && "bg-amber-50 text-warning",
        tone === "danger" && "bg-red-50 text-danger",
        className,
      )}
      {...props}
    />
  );
}
