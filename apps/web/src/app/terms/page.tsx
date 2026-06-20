import { PublicPage } from "@/components/phase02/public-page";

export default function TermsPage() {
  return (
    <PublicPage
      eyebrow="Terms"
      title="Условия сервиса будут оформлены перед запуском"
      description="Phase 02 резервирует маршрут и место в структуре продукта. Юридический текст не считается готовым документом."
      items={[
        "Публикация всегда требует подтверждения человека.",
        "Mock billing не является реальным платежом.",
        "Финальные условия нужно подтвердить отдельно.",
      ]}
      primaryHref="/privacy"
      primaryLabel="Privacy"
    />
  );
}
