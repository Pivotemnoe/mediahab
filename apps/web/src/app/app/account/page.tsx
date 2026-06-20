import { KeyRound, LogOut, MailCheck, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { accountSettings, sessionRows } from "@/features/account-workspace/account-workspace-fixtures";

export default function AccountPage() {
  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        actions={
          <Button type="button" variant="secondary">
            <LogOut size={16} />
            Выйти со всех устройств
          </Button>
        }
        description="Профиль, подтверждение почты, безопасность и управление активными сессиями."
        eyebrow="UI Phase 09"
        title="Аккаунт"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MailCheck size={18} className="text-primary" />
            Настройки профиля
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {accountSettings.map(([label, value, status]) => (
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
            Cookie-сессия, CSRF-токен, Argon2id и отзыв сессий подключаются через API auth.
          </p>
          <Button type="button" variant="secondary">
            <KeyRound size={16} />
            Сменить пароль
          </Button>
        </Card>
      </div>

      <Card className="grid gap-3">
        <div className="text-sm font-semibold text-foreground">Активные сессии</div>
        {sessionRows.map(([device, client, seen, state]) => (
          <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[160px_1fr_140px_auto]" key={device}>
            <div className="font-medium text-foreground">{device}</div>
            <div className="text-sm text-muted">{client}</div>
            <div className="text-sm text-muted">{seen}</div>
            <Badge tone={state === "current" ? "success" : "neutral"}>{state}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
