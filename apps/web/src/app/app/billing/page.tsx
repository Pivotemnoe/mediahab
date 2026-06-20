import { BadgeDollarSign, CreditCard, FileText, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UsageMeter } from "@/components/ui/usage-meter";

const limits = [
  ["Проекты", 1, 15, "success"],
  ["AI-генерации", 62, 250, "warning"],
  ["Расшифровка, мин", 18, 120, "neutral"],
  ["Хранилище, ГБ", 2, 50, "neutral"],
] as const;

const plans = [
  ["Free", "Личный тест", "1 проект, ручные публикации", "текущий"],
  ["Start", "Пилот", "3 проекта, базовые лимиты", "mock checkout"],
  ["Pro", "Рабочий режим", "15 проектов, Instagram-флаг", "ручное включение"],
  ["Business", "Команда", "расширенные лимиты", "по запросу"],
] as const;

const history = [
  ["mock_pay_phase11", "simulated_succeeded", "0 ₽", "платёж не списан"],
  ["mock_inv_phase11", "mock_issued", "0 ₽", "счёт-заглушка"],
] as const;

export default function BillingPage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        actions={
          <Button disabled variant="secondary">
            <CreditCard size={16} />
            Реальная оплата выключена
          </Button>
        }
        description="Тарифы, лимиты, payment placeholder и invoices placeholder без настоящего списания денег."
        eyebrow="UI Phase 09"
        title="Тариф и оплата"
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge tone="success">Активен</Badge>
              <h2 className="mt-3 text-xl font-semibold text-foreground">Free</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Текущий тариф используется для серверной проверки лимитов. Коммерческие цены не зашиты в код.
              </p>
            </div>
            <BadgeDollarSign size={22} className="text-primary" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {limits.map(([label, value, max, tone]) => (
              <UsageMeter key={label} label={label} max={max} tone={tone} value={value} />
            ))}
          </div>
        </Card>

        <Card className="grid content-start gap-3">
          <ShieldCheck size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Статус запуска</h2>
          <p className="text-sm leading-6 text-muted">
            Public launch заблокирован до RLS, backup restore drill, юридических документов и выбора реального провайдера оплаты.
            Для MVP показываем manual-contact/payment placeholder, а не фейковый успешный checkout.
          </p>
          <Badge tone="warning" className="w-fit">
            mock provider only
          </Badge>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {plans.map(([name, subtitle, description, status]) => (
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
            <p className="mt-1 text-sm text-muted">История отображает mock-события и явно показывает, что списания не было.</p>
          </div>
          <FileText size={20} className="text-primary" />
        </div>
        <div className="grid gap-2">
          {history.map(([id, status, amount, note]) => (
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
