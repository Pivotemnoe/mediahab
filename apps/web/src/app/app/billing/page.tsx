import { CabinetPage } from "@/components/phase02/cabinet-page";

export default function BillingPage() {
  return (
    <CabinetPage
      title="Тариф"
      description="Биллинг-заглушка нужен для серверной проверки лимитов. Реальная оплата на этапе 02 не подключается."
      rows={[
        ["Тарифы", "Free, Start, Pro и Business загружены как редактируемые записи."],
        ["Оплата", "Оплата-заглушка создаёт состояние ожидания ручного контакта без списания."],
        ["Расход", "События расхода и значения лимитов доступны через API."],
      ]}
    />
  );
}
