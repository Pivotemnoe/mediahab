import { PublicPage } from "@/components/phase02/public-page";

export default function SecurityPage() {
  return (
    <PublicPage
      eyebrow="Безопасность"
      title="Сессии, роли и изоляция данных"
      description="Каркас безопасности строится до контентных данных: пароли хешируются Argon2id, сессии отзывные, область рабочего пространства проверяется на сервере."
      items={[
        "HttpOnly SameSite cookies и CSRF для мутаций с cookie.",
        "ID чужого рабочего пространства возвращает 404.",
        "Недостаточная роль возвращает 403.",
        "RLS остаётся отдельной фазой усиления.",
      ]}
    />
  );
}
