import { PublicPage } from "@/components/phase02/public-page";

export default function PricingPage() {
  return (
    <PublicPage
      eyebrow="Pricing"
      title="Тарифы пока работают как технические лимиты"
      description="Free, Start, Pro и Business уже есть в базе как редактируемые записи. Реальная оплата не подключена, checkout создаёт только pending mock-состояние."
      items={[
        "Free ограничивает команду одним местом на backend.",
        "Start, Pro и Business нужны для проверки entitlement resolver.",
        "Mock checkout всегда возвращает payment_captured=false.",
        "Коммерческие цены не зашиты в код.",
      ]}
      primaryHref="/app/billing"
      primaryLabel="Открыть billing"
    />
  );
}
