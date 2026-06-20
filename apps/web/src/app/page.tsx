import { PublicPage } from "@/components/phase02/public-page";

export default function MarketingIndex() {
  return (
    <PublicPage
      eyebrow="Phase 02"
      title="SaaS-каркас для контент-студии"
      description="Техническая оболочка уже включает регистрацию, cookie-сессии, workspace boundary, роли, тарифы-заглушки и mock billing без реального списания."
      items={[
        "Email/password auth и отзыв сессий на backend.",
        "Workspace membership и роли owner, admin, editor, viewer.",
        "Free, Start, Pro, Business как редактируемые тарифные записи.",
        "OpenAPI остаётся источником frontend-контракта.",
      ]}
      primaryHref="/register"
      primaryLabel="Создать аккаунт"
    />
  );
}
