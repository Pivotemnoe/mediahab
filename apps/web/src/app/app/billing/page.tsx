import { BadgeDollarSign, CreditCard, FileText, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UsageMeter } from "@/components/ui/usage-meter";
import { getBillingViewModel } from "@/services/workspace-settings";

export default async function BillingPage() {
  const viewModel = await getBillingViewModel();

  return (
    <div className="grid gap-5">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge>{viewModel.modeLabel}</Badge>
            <Button disabled variant="secondary">
              <CreditCard size={16} />
              Реальная оплата выключена
            </Button>
          </div>
        }
        description="Тарифы, лимиты, заглушка оплаты и заглушка счетов без настоящего списания денег."
        eyebrow="Этап UI 09"
        title="Тариф и оплата"
      />
      {viewModel.notice ? (
        <Card className="border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] text-sm leading-6 text-muted">
          {viewModel.notice}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="success">{viewModel.currentPlan.status}</Badge>
              <h2 className="mt-3 text-xl font-semibold text-foreground">{viewModel.currentPlan.name}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {viewModel.currentPlan.description}
              </p>
            </div>
            <BadgeDollarSign size={22} className="text-primary" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {viewModel.limits.map(({ label, max, tone, value }) => (
              <UsageMeter key={label} label={label} max={max} tone={tone} value={value} />
            ))}
          </div>
        </Card>

        <Card className="grid content-start gap-3">
          <ShieldCheck size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Статус запуска</h2>
          <p className="text-sm leading-6 text-muted">
            Публичный запуск заблокирован до RLS, проверки восстановления из бэкапа, юридических документов и выбора реального провайдера оплаты.
            Для MVP показываем ручной контакт и заглушку оплаты, а не фейковый успешный платёж.
          </p>
          <Badge tone="warning" className="w-fit">
            только тестовый провайдер
          </Badge>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {viewModel.plans.map(({ description, name, status, subtitle }) => (
          <Card className="grid gap-3" key={name}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">{name}</h2>
              <Badge tone={status === "текущий" ? "success" : "info"}>{status}</Badge>
            </div>
            <div className="text-sm font-medium text-foreground">{subtitle}</div>
            <p className="text-sm leading-6 text-muted">{description}</p>
          </Card>
        ))}
      </div>

      <Card className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Платежи и счета</h2>
            <p className="mt-1 text-sm text-muted">История отображает тестовые события и явно показывает, что списания не было.</p>
          </div>
          <FileText size={20} className="text-primary" />
        </div>
        <div className="grid gap-2">
          {viewModel.history.map(({ amount, id, note, status }) => (
            <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_180px_120px_160px]" key={id}>
              <div className="min-w-0 text-sm font-medium text-foreground">{id}</div>
              <Badge tone="info" className="w-fit">
                {status}
              </Badge>
              <div className="text-sm text-muted">{amount}</div>
              <div className="text-sm text-muted">{note}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
