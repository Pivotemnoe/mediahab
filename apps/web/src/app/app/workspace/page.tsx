import { ShieldCheck, UserPlus, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWorkspaceViewModel } from "@/services/workspace-settings";

export default async function WorkspacePage() {
  const viewModel = await getWorkspaceViewModel();

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge>{viewModel.modeLabel}</Badge>
            <Button type="button">
              <UserPlus size={16} />
              Пригласить
            </Button>
          </div>
        }
        description="Команда, роли, изоляция данных и будущая детальная модель прав."
        eyebrow="Этап UI 09"
        title="Рабочее пространство"
      />
      {viewModel.notice ? (
        <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
          {viewModel.notice}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="grid gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UsersRound size={18} className="text-primary" />
            Роли команды
          </div>
          {viewModel.roles.map(({ permissions, role, tone, user }) => (
            <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[160px_160px_1fr]" key={role}>
              <div className="font-medium text-foreground">{role}</div>
              <Badge className="w-fit" tone={tone}>
                {user}
              </Badge>
              <div className="text-sm leading-6 text-muted">{permissions}</div>
            </div>
          ))}
        </Card>

        <Card className="grid content-start gap-3">
          <ShieldCheck size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Изоляция и лимиты</h2>
          {viewModel.permissionNotes.map(({ label, text }) => (
            <div className="rounded-md border border-border bg-surface-muted p-3" key={label}>
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="mt-1 text-xs leading-5 text-muted">{text}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card className="grid gap-3">
        <div className="text-sm font-semibold text-foreground">Положение приглашений</div>
        <div className="grid gap-3 md:grid-cols-3">
          {viewModel.invitationStats.map(({ label, value }) => (
            <div className="rounded-md border border-border p-3" key={label}>
              <div className="text-xs text-muted">{label}</div>
              <div className="mt-1 font-medium text-foreground">{value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
