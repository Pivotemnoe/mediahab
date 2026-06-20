import { PublicPage } from "@/components/phase02/public-page";

export default function FeaturesPage() {
  return (
    <PublicPage
      eyebrow="Features"
      title="Конструктор контента, публикаций и платформ"
      description="Phase 02 фиксирует SaaS-границу. Проекты, рубрики, контент-студия, медиа и публикации идут следующими фазами."
      items={[
        "Единый ContentItem вместо поста под одну площадку.",
        "Отдельные master revision и platform variants.",
        "Backend authorization до появления tenant content.",
        "Подготовленные extension points для Telegram, MAX, Instagram и будущих коннекторов.",
      ]}
    />
  );
}
