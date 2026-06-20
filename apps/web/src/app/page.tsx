import { PublicPage } from "@/components/phase02/public-page";

export default function MarketingIndex() {
  return (
    <PublicPage
      eyebrow="Этап 02"
      title="SaaS-каркас для контент-студии"
      description="Техническая оболочка уже включает регистрацию, cookie-сессии, границу рабочего пространства, роли, тарифы-заглушки и биллинг-заглушку без реального списания."
      items={[
        "Авторизация по email и паролю, отзыв сессий на сервере.",
        "Участники рабочего пространства и роли владельца, администратора, редактора и наблюдателя.",
        "Free, Start, Pro, Business как редактируемые тарифные записи.",
        "OpenAPI остаётся источником контракта для интерфейса.",
      ]}
      primaryHref="/register"
      primaryLabel="Создать аккаунт"
    />
  );
}
