import { CabinetPage } from "@/components/phase02/cabinet-page";

export default function AccountPage() {
  return (
    <CabinetPage
      title="Аккаунт"
      description="Страница зарезервирована для профиля, подтверждения почты, управления сессиями и сброса пароля."
      rows={[
        ["Идентификация", "Электронная почта и пароль, Argon2id, отметка подтверждения почты."],
        ["Сессии", "Просмотр и отзыв активных сессий через API."],
        ["Безопасность", "Cookie-сессия, CSRF-токен и выход со всех устройств."],
      ]}
    />
  );
}
