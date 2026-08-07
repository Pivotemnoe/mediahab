import Link from "next/link";
import { ArrowRight, BadgeRussianRuble, ShieldAlert } from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const plans = [
  ["Знакомство", "попробовать на своём материале", "1 проект, диктовка и ручная подготовка версий"],
  ["Автор", "для регулярных публикаций", "несколько проектов, сохранённый стиль и больше обработок"],
  ["Редакция", "для совместной работы", "команда, согласование материалов и расширенные лимиты"],
] as const;

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10">
        <div className="max-w-3xl">
          <Badge tone="warning">Тарифы готовятся</Badge>
          <h1 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-6xl">Начните с идеи, а не с выбора тарифа.</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Сейчас можно познакомиться с продуктом без сложного выбора. Перед запуском оплаты здесь появятся точные цены, лимиты и понятные условия отмены.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
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
              <div className="text-sm font-medium text-primary">Стоимость появится до запуска оплаты</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldAlert size={18} className="text-warning" />
              Оплата не включена
            </div>
            <p className="text-sm leading-6 text-muted">
              «Наговори» не будет показывать фиктивную покупку. Подписка появится после готовности оплаты, чеков, возвратов и прозрачных условий отмены.
            </p>
          </Card>
          <div className="flex items-center">
            <Button asChild>
              <Link href="/app/billing">
                Мой текущий тариф
                <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
