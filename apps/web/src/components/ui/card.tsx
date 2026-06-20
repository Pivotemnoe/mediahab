import { type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-lg border border-line bg-white p-4 shadow-panel",
        className,
      )}
      {...props}
    />
  );
}
