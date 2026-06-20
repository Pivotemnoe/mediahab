import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import {
  EmptyState,
  ErrorState,
  LimitReachedState,
  LoadingState,
  OfflineState,
  PermissionState,
} from "@/components/states/screen-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { UsageMeter } from "@/components/ui/usage-meter";

export default function ShowcasePage() {
  return (
    <div className="grid min-w-0 max-w-full gap-5">
      <PageHeader
        actions={
          <Button asChild variant="secondary">
            <Link href="/app">Назад к дашборду</Link>
          </Button>
        }
        description="Техническая витрина токенов, примитивов, состояний и русских UI-текстов."
        eyebrow="Этап UI 01"
        title="Витрина дизайн-системы"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="grid content-start gap-4">
          <h2 className="text-lg font-semibold text-foreground">Кнопки и статусы</h2>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Button className="w-full sm:w-auto" type="button">
              Основная
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="secondary">
              Вторичная
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="ghost">
              Тихая
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="danger">
              Опасная
            </Button>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Badge>черновик</Badge>
            <Badge tone="info">информация</Badge>
            <Badge tone="success">готово</Badge>
            <Badge tone="warning">требует внимания</Badge>
            <Badge tone="danger">ошибка</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <StatusBadge status="success">опубликовано</StatusBadge>
            <StatusBadge status="warning">нужен ручной экспорт</StatusBadge>
            <StatusBadge status="danger">ошибка без повторов</StatusBadge>
            <StatusBadge status="info">симуляция</StatusBadge>
          </div>
        </Card>

        <Card className="grid content-start gap-4">
          <h2 className="text-lg font-semibold text-foreground">Лимиты</h2>
          <UsageMeter label="Генерации" max={100} value={42} />
          <UsageMeter label="Медиа" max={100} tone="success" value={28} />
          <UsageMeter label="Повторы вебхука" max={100} tone="warning" value={76} />
          <UsageMeter label="Ошибки" max={100} tone="danger" value={12} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <LoadingState />
        <EmptyState />
        <ErrorState />
        <OfflineState />
        <PermissionState />
        <LimitReachedState />
      </div>
    </div>
  );
}
