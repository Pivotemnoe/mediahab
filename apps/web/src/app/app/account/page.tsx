import { MailCheck, ShieldCheck } from "lucide-react";

import { LogoutButton } from "@/components/layout/logout-button";
import { PageHeader } from "@/components/layout/page-header";
import { TourReplayButton } from "@/components/layout/tour-replay-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAccountViewModel } from "@/services/workspace-settings";

export default async function AccountPage() {
  const viewModel = await getAccountViewModel();

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        actions={(
          <div className="flex flex-wrap items-start justify-end gap-2">
            <TourReplayButton />
            <LogoutButton />
          </div>
        )}
        description="Профиль, подтверждение почты и устройства, на которых выполнен вход."
        title="Аккаунт"
      />
      {viewModel.notice ? (
        <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
          {viewModel.notice}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MailCheck size={18} className="text-primary" />
            Настройки профиля
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {viewModel.settings.map(({ label, status, value }) => (
              <div className="rounded-md border border-border bg-surface-muted p-3" key={label}>
                <div className="text-xs text-muted">{label}</div>
                <div className="mt-1 break-words font-medium text-foreground">{value}</div>
                <Badge className="mt-2" tone="success">
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="grid content-start gap-3">
          <ShieldCheck size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Безопасность</h2>
          <p className="text-sm leading-6 text-muted">
            Пароль хранится в защищённом виде, а вход можно завершить на каждом устройстве отдельно. Никому не сообщайте пароль и коды из писем.
          </p>
        </Card>
      </div>

      <Card className="grid gap-3">
        <div className="text-sm font-semibold text-foreground">Активные сессии</div>
        {viewModel.sessions.map(({ client, device, seen, state }) => (
          <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[180px_1fr_140px_auto]" key={`${device}-${client}-${seen}`}>
            <div className="font-medium text-foreground">{device}</div>
            <div className="text-sm text-muted">{client}</div>
            <div className="text-sm text-muted">{seen}</div>
            <Badge tone={state === "текущая" ? "success" : "neutral"}>{state}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
