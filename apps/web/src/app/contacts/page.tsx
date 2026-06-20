import { PublicPage } from "@/components/phase02/public-page";

export default function ContactsPage() {
  return (
    <PublicPage
      eyebrow="Контакты"
      title="Контактная страница технической оболочки"
      description="Публичная страница существует для маршрутизации и будущего запуска. Финальные тексты и способы связи можно заменить позже."
      items={[
        "Форма связи не отправляет данные на этапе 02.",
        "Публичные маршруты готовы для дальнейшей доработки.",
        "Условия и политика данных выделены отдельными страницами.",
      ]}
      primaryHref="/security"
      primaryLabel="Безопасность"
    />
  );
}
