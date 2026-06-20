import Link from "next/link";
import { AlertTriangle, CalendarClock, FileEdit, FolderKanban, Plus, RadioTower } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { UsageMeter } from "@/components/ui/usage-meter";
import { getDashboardViewModel } from "@/services/dashboard";

export default async function DashboardPage() {
  const dashboard = await getDashboardViewModel();

  return (
    <div className="grid gap-5">
      <PageHeader
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/app/projects">
                <FolderKanban size={16} />
                Проекты
              </Link>
            </Button>
            <Button asChild>
              <Link href="/app/content/new">
                <Plus size={16} />
                Новый материал
              </Link>
            </Button>
          </>
        }
        description="Рабочая сводка по проектам, черновикам, расписанию, интеграциям и лимитам."
        eyebrow="Рабочее пространство"
        title="Дашборд"
      />

      {dashboard.notice ? (
        <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
          {dashboard.notice}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {dashboard.stats.map((item) => (
          <Card key={item.label}>
            <div className="text-sm text-muted">{item.label}</div>
            <div className="mt-3 text-3xl font-semibold text-foreground">{item.value}</div>
            <div className="mt-1 text-sm leading-6 text-muted">{item.note}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Недавние материалы</h2>
              <p className="mt-1 text-sm text-muted">Черновики, которые требуют редакторского внимания.</p>
            </div>
            <FileEdit size={20} className="text-primary" />
          </div>
          {dashboard.recentDrafts.map(({ rubric, status, title }) => (
            <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto]" key={title}>
              <div>
                <div className="text-sm font-medium text-foreground">{title}</div>
                <div className="mt-1 text-xs text-muted">{rubric}</div>
              </div>
              <Badge tone="info" className="h-fit w-fit">
                {status}
              </Badge>
            </div>
          ))}
        </Card>

        <Card className="grid content-start gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Лимиты</h2>
              <p className="mt-1 text-sm text-muted">Текущий снимок использования.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge tone="success">{dashboard.planLabel}</Badge>
              <Badge>{dashboard.modeLabel}</Badge>
            </div>
          </div>
          {dashboard.usageRows.map(({ label, max, tone, value }) => (
            <UsageMeter key={label} label={label} max={max} tone={tone} value={value} />
          ))}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarClock size={18} className="text-primary" />
            Расписание
          </div>
          {dashboard.scheduledPublications.map(({ platform, status, time }) => (
            <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[120px_1fr_auto]" key={platform}>
              <div className="text-sm font-medium text-foreground">{platform}</div>
              <div className="text-sm text-muted">{time}</div>
              <StatusBadge status={status === "запланировано" ? "success" : "warning"}>{status}</StatusBadge>
            </div>
          ))}
        </Card>

        <Card className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <RadioTower size={18} className="text-primary" />
            Интеграции
          </div>
          {dashboard.integrationAlerts.map(({ note, platform, tone }) => (
            <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[120px_1fr_auto]" key={platform}>
              <div className="text-sm font-medium text-foreground">{platform}</div>
              <div className="text-sm text-muted">{note}</div>
              <StatusBadge status={tone === "success" ? "success" : "warning"}>
                {tone === "success" ? "готово" : "внимание"}
              </StatusBadge>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-md border border-border bg-surface-muted p-3 text-sm leading-6 text-muted">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
            Боевой Instagram остаётся под флагом до готовности аккаунта Meta и проверки.
          </div>
        </Card>
      </div>
    </div>
  );
}
