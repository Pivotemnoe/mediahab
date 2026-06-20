import { KeyRound, RadioTower, ShieldCheck, Webhook } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const integrations = [
  ["OpenAI", "STT, генерация и embeddings через отдельные provider-интерфейсы.", "готово"],
  ["TimeWeb S3", "S3-совместимое хранилище для медиа и пакетов экспорта.", "готово"],
  ["Generic webhook", "simulate по умолчанию, live только после SSRF-контролей.", "ограничено"],
  ["Нативные соцсети", "Telegram, MAX и Instagram требуют backend-коннекторы.", "позже"],
] as const;

export default function IntegrationsPage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        description="Техническая карта подключений MVP без вывода секретов в клиентский интерфейс."
        eyebrow="Провайдеры"
        title="Интеграции"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map(([name, text, status]) => (
          <Card className="grid gap-3" key={name}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {name === "Generic webhook" ? <Webhook size={18} /> : <RadioTower size={18} />}
                {name}
              </div>
              <Badge tone={status === "готово" ? "success" : "warning"}>{status}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted">{text}</p>
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
            Webhook live включается только owner/admin после challenge verification.
          </div>
        </div>
      </Card>
    </div>
  );
}
