import { ShieldAlert } from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10">
        <div className="max-w-3xl">
          <Badge tone="success">Сейчас бесплатно</Badge>
          <h1 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-6xl">Во время тестирования платить не нужно.</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            «Наговори» сейчас доступен по приглашениям и без оплаты. Когда появятся тарифы, здесь заранее будут точные цены, лимиты и условия.
          </p>
        </div>

        <div className="grid gap-4">
          <Card className="grid gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldAlert size={18} className="text-warning" />
              Оплаты пока нет
            </div>
            <p className="text-sm leading-6 text-muted">
              Подписка появится только вместе с понятными ценами, чеками, возвратами и условиями отмены. До этого «Наговори» не попросит данные карты и ничего не спишет.
            </p>
          </Card>
        </div>
      </section>
    </MarketingShell>
  );
}
