import { PublicPage } from "@/components/phase02/public-page";

export default function PricingPage() {
  return (
    <PublicPage
      eyebrow="Тарифы"
      title="Тарифы пока работают как технические лимиты"
      description="Free, Start, Pro и Business уже есть в базе как редактируемые записи. Реальная оплата не подключена, оплата-заглушка создаёт только ожидающее состояние."
      items={[
        "Free ограничивает команду одним местом на сервере.",
        "Start, Pro и Business нужны для проверки серверных лимитов.",
        "Оплата-заглушка всегда возвращает состояние без списания.",
        "Коммерческие цены не зашиты в код.",
      ]}
      primaryHref="/app/billing"
      primaryLabel="Открыть тариф"
    />
  );
}
