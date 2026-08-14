import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function BillingPage() {
  return (
    <PilotUnavailable
      description="Первая тестовая версия предоставляется по приглашению и без оплаты. Тарифы появятся только после того, как основной сценарий будет проверен пользователями."
      title="Оплата в пилоте не нужна"
    />
  );
}
