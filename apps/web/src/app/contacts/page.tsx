import { PublicPage } from "@/components/phase02/public-page";

export default function ContactsPage() {
  return (
    <PublicPage
      eyebrow="Contacts"
      title="Контактная страница технического SaaS shell"
      description="Публичная страница существует для маршрутизации и будущего запуска. Финальные тексты и способы связи можно заменить позже."
      items={[
        "Форма связи не отправляет данные в Phase 02.",
        "Публичные маршруты готовы для дальнейшей доработки.",
        "Terms и Privacy выделены отдельными страницами.",
      ]}
      primaryHref="/security"
      primaryLabel="Безопасность"
    />
  );
}
