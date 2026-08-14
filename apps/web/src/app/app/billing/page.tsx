import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function BillingPage() {
  return (
    <PilotUnavailable
      description="Сейчас «Наговори» доступен по приглашению и без оплаты. О ценах и условиях будет известно заранее."
      title="Во время тестирования платить не нужно"
    />
  );
}
