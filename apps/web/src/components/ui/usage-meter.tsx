import { cn } from "@/lib/cn";

type UsageMeterProps = {
  className?: string;
  label: string;
  labelClassName?: string;
  max: number;
  tone?: "danger" | "neutral" | "success" | "warning";
  trackClassName?: string;
  value: number;
  valueClassName?: string;
};

export function UsageMeter({
  className,
  label,
  labelClassName,
  max,
  tone = "neutral",
  trackClassName,
  value,
  valueClassName,
}: UsageMeterProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={cn("text-muted", labelClassName)}>{label}</span>
        <span className={cn("font-medium text-foreground", valueClassName)}>
          {value} / {max}
        </span>
      </div>
      <div className={cn("h-2 overflow-hidden rounded-full bg-surface-muted", trackClassName)}>
        <div
          className={cn(
            "h-full rounded-full",
            tone === "neutral" && "bg-primary",
            tone === "success" && "bg-success",
            tone === "warning" && "bg-warning",
            tone === "danger" && "bg-danger",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
