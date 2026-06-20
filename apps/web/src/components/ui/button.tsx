import { Slot } from "@radix-ui/react-slot";
import { type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: "sm" | "md" | "icon";
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  asChild,
  className,
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-9 px-3",
        size === "md" && "h-10 px-4",
        size === "icon" && "h-10 w-10 px-0",
        variant === "primary" &&
          "bg-primary text-primary-foreground hover:brightness-95 focus-visible:outline-ring",
        variant === "secondary" &&
          "border border-border bg-surface text-foreground hover:bg-surface-muted focus-visible:outline-ring",
        variant === "ghost" &&
          "text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-ring",
        variant === "danger" &&
          "bg-danger text-white hover:brightness-95 focus-visible:outline-danger",
        className,
      )}
      {...props}
    />
  );
}
