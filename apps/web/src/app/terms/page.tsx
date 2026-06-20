import { PublicPage } from "@/components/phase02/public-page";

export default function TermsPage() {
  return (
    <PublicPage
      eyebrow="Условия"
      title="Условия сервиса будут оформлены перед запуском"
      description="Этап 02 резервирует маршрут и место в структуре продукта. Юридический текст не считается готовым документом."
      items={[
        "Публикация всегда требует подтверждения человека.",
        "Биллинг-заглушка не является реальным платежом.",
        "Финальные условия нужно подтвердить отдельно.",
      ]}
      primaryHref="/privacy"
      primaryLabel="Политика данных"
    />
  );
}
