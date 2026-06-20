import { PublicPage } from "@/components/phase02/public-page";

export default function PrivacyPage() {
  return (
    <PublicPage
      eyebrow="Privacy"
      title="Политика данных будет финализирована перед запуском"
      description="Маршрут создан заранее, потому что продукт хранит workspace data, media, provider credentials и audit trail."
      items={[
        "Secrets не должны попадать в browser storage.",
        "Connector tokens будут шифроваться на backend.",
        "Workspace export/deletion идёт в hardening scope.",
      ]}
      primaryHref="/security"
      primaryLabel="Security"
    />
  );
}
