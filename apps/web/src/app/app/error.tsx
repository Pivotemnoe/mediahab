"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Card className="grid max-w-lg gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="text-danger" size={18} />
          Не удалось открыть раздел
        </div>
        <p className="text-sm leading-6 text-muted">
          Детали ошибки не показываются в интерфейсе. Можно повторить загрузку или вернуться в кабинет.
        </p>
        <Button type="button" onClick={reset}>
          <RotateCcw size={16} />
          Повторить
        </Button>
      </Card>
    </div>
  );
}
