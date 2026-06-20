import { PublicPage } from "@/components/phase02/public-page";

export default function SecurityPage() {
  return (
    <PublicPage
      eyebrow="Security"
      title="Сессии, роли и tenant isolation"
      description="Каркас безопасности строится до контентных данных: пароли хешируются Argon2id, сессии отзывные, workspace scope проверяется на backend."
      items={[
        "HttpOnly SameSite cookies и CSRF для cookie mutations.",
        "Cross-workspace IDs возвращают 404.",
        "Недостаточная роль возвращает 403.",
        "RLS остаётся отдельной hardening-фазой.",
      ]}
    />
  );
}
