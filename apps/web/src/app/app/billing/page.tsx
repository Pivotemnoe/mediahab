import { CabinetPage } from "@/components/phase02/cabinet-page";

export default function BillingPage() {
  return (
    <CabinetPage
      title="Billing"
      description="Mock billing нужен для backend entitlement checks. Реальная оплата в Phase 02 не подключается."
      rows={[
        ["Plans", "Free, Start, Pro, Business seeded as editable records."],
        ["Checkout", "Mock checkout: pending_manual_contact, payment_captured=false."],
        ["Usage", "Usage events и entitlement values доступны через API."],
      ]}
    />
  );
}
