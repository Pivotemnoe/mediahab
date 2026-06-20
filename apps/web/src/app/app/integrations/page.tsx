import { KeyRound, Power, RadioTower, RotateCcw, ShieldCheck, Webhook } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { connectorCards } from "@/features/publication-ops/publication-ops-fixtures";

export default function IntegrationsPage() {
  return (
    <div className="grid min-w-0 gap-5">
      <PageHeader
        description="Площадки, права, возможности и безопасный боевой режим без вывода секретов в клиентский интерфейс."
        eyebrow="Этап UI 07"
        title="Интеграции"
      />
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {connectorCards.map((connector) => (
          <Card className="grid content-start gap-4" key={connector.name}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                {connector.name === "Универсальный вебхук" ? <Webhook size={18} /> : <RadioTower size={18} />}
                <span className="min-w-0 break-words">{connector.name}</span>
              </div>
              <Badge
                className="shrink-0"
                tone={connector.tone === "success" ? "success" : connector.tone === "warning" ? "warning" : "neutral"}
              >
                {connector.state}
              </Badge>
            </div>
            <div className="grid gap-2 text-sm">
              {[
                ["Аккаунт", connector.account],
                ["Права", connector.permissions],
                ["Токен", connector.token],
                ["Возможность", connector.capability],
              ].map(([label, value]) => (
                <div className="rounded-md border border-border bg-surface-muted p-3" key={label}>
                  <div className="text-xs text-muted">{label}</div>
                  <div className="mt-1 break-words font-medium text-foreground">{value}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" type="button" variant="secondary">
                <ShieldCheck size={14} />
                Тест
              </Button>
              <Button size="sm" type="button" variant="secondary">
                <RotateCcw size={14} />
                Переподключить
              </Button>
              <Button size="sm" type="button" variant="ghost">
                <Power size={14} />
                Отключить
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card className="grid gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck size={18} className="text-success" />
          Безопасность
        </div>
        <div className="grid gap-2 text-sm text-muted md:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <KeyRound size={16} className="mb-2 text-primary" />
            Секреты не хранятся в клиентском коде, фикстурах и логах.
          </div>
          <div className="rounded-md border border-border p-3">
            Боевой вебхук включается только владельцем или администратором после SSRF-контролей и проверки endpoint.
          </div>
        </div>
      </Card>
    </div>
  );
}
