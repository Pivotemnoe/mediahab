import Link from "next/link";
import { ArrowRight, BadgeRussianRuble, ShieldAlert } from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const plans = [
  ["Бесплатный", "для личного теста", "1 проект, ограниченные ИИ-лимиты, ручные публикации"],
  ["Старт", "для пилота", "несколько проектов, базовая расшифровка и расписание"],
  ["Pro", "для регулярной работы", "больше проектов, автопубликации и Instagram-флаг"],
  ["Business", "для команды", "расширенные лимиты, ручное согласование условий"],
] as const;

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10">
        <div className="max-w-3xl">
          <Badge tone="warning">Оплата пока не подключена</Badge>
          <h1 className="mt-4 text-4xl font-semibold text-foreground sm:text-5xl">Тарифы MediaHub</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Планы уже существуют как редактируемые записи и серверные лимиты. Реальная подписка появится только после выбора провайдера,
            юридических условий и продакшен-проверок.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {plans.map(([name, subtitle, description]) => (
            <Card className="grid gap-4" key={name}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{name}</h2>
                  <p className="mt-1 text-sm text-muted">{subtitle}</p>
                </div>
                <BadgeRussianRuble size={20} className="text-primary" />
              </div>
              <p className="text-sm leading-6 text-muted">{description}</p>
              <div className="text-sm font-medium text-foreground">Цена редактируется в базе</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldAlert size={18} className="text-warning" />
              Реальный запуск заблокирован
            </div>
            <p className="text-sm leading-6 text-muted">
              До боевого биллинга нужно подтвердить провайдера оплаты, юридическое лицо, чеки, возвраты, отмену подписки,
              документы приватности и оферты, RLS и проверку восстановления из бэкапа.
            </p>
          </Card>
          <div className="flex items-center">
            <Button asChild>
              <Link href="/app/billing">
                Открыть биллинг
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
