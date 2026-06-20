import { AuthPage } from "@/components/phase02/auth-page";

export default function RegisterPage() {
  return (
    <AuthPage
      title="Регистрация"
      description="API регистрации создаёт пользователя, рабочее пространство владельца, участие, Free-подписку, сессию и токен подтверждения почты."
      fields={["Электронная почта", "Пароль", "Имя", "Название пространства"]}
      submitLabel="Создать аккаунт"
      secondaryHref="/login"
      secondaryLabel="Уже есть аккаунт"
    />
  );
}
