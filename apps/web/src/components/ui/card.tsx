import { type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "box-border w-full max-w-[calc(100vw-3rem)] min-w-0 rounded-lg border border-border bg-surface p-4 shadow-panel sm:max-w-full",
        className,
      )}
      {...props}
    />
  );
}
