import { Slot } from "@radix-ui/react-slot";
import { type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  asChild,
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        variant === "primary" &&
          "bg-accent text-white hover:bg-blue-700 focus-visible:outline-accent",
        variant === "secondary" &&
          "border border-line bg-white text-ink hover:bg-surface focus-visible:outline-accent",
        variant === "ghost" &&
          "text-muted hover:bg-surface hover:text-ink focus-visible:outline-accent",
        className,
      )}
      {...props}
    />
  );
}
