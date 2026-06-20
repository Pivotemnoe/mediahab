import {
  AlertTriangle,
  Ban,
  CloudOff,
  FileQuestion,
  LoaderCircle,
  LockKeyhole,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type ScreenStateProps = {
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  description: string;
  icon: LucideIcon;
  title: string;
  tone?: "danger" | "neutral" | "warning";
};

function ScreenState({
  actionHref,
  actionLabel,
  className,
  description,
  icon: Icon,
  title,
  tone = "neutral",
}: ScreenStateProps) {
  return (
    <Card className={cn("grid place-items-center px-6 py-10 text-center", className)}>
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-lg border",
          tone === "neutral" && "border-border bg-surface-muted text-muted",
          tone === "warning" &&
            "border-warning bg-[color-mix(in_srgb,var(--warning),transparent_88%)] text-warning",
          tone === "danger" &&
            "border-danger bg-[color-mix(in_srgb,var(--danger),transparent_88%)] text-danger",
        )}
      >
        <Icon size={22} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-5" variant="secondary">
          <a href={actionHref}>{actionLabel}</a>
        </Button>
      ) : null}
    </Card>
  );
}

export function LoadingState({ className }: { className?: string }) {
  return (
    <Card className={cn("grid place-items-center px-6 py-10 text-center", className)}>
      <LoaderCircle className="animate-spin text-primary" size={28} />
      <div className="mt-4 text-sm font-medium text-foreground">Загрузка</div>
      <div className="mt-1 text-sm text-muted">Получаем данные рабочего пространства.</div>
    </Card>
  );
}

export function EmptyState({ className }: { className?: string }) {
  return (
    <ScreenState
      className={className}
      description="Здесь появятся материалы после первого действия пользователя."
      icon={FileQuestion}
      title="Пока пусто"
    />
  );
}

export function ErrorState({ className }: { className?: string }) {
  return (
    <ScreenState
      className={className}
      description="Действие не выполнено. Покажите безопасное описание ошибки и предложите повторить."
      icon={AlertTriangle}
      title="Не удалось загрузить"
      tone="danger"
    />
  );
}

export function OfflineState({ className }: { className?: string }) {
  return (
    <ScreenState
      className={className}
      description="Черновики можно продолжить локально, но AI-генерация и публикация требуют соединения."
      icon={CloudOff}
      title="Нет соединения"
      tone="warning"
    />
  );
}

export function PermissionState({ className }: { className?: string }) {
  return (
    <ScreenState
      className={className}
      description="У текущей роли нет прав на это действие. Сервер всё равно остаётся источником прав."
      icon={LockKeyhole}
      title="Недостаточно прав"
      tone="warning"
    />
  );
}

export function LimitReachedState({ className }: { className?: string }) {
  return (
    <ScreenState
      className={className}
      description="Лимит тарифа достигнут. Интерфейс должен объяснить, что именно ограничено."
      icon={Ban}
      title="Лимит достигнут"
      tone="warning"
    />
  );
}
