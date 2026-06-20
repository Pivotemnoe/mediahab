import { AuthPage } from "@/components/phase02/auth-page";

export default function LoginPage() {
  return (
    <AuthPage
      title="Вход"
      description="Backend уже принимает email/password login и выдаёт отзывную cookie-сессию. Подключение живой формы будет следующим frontend шагом."
      fields={["Email", "Password"]}
      submitLabel="Войти"
      secondaryHref="/forgot-password"
      secondaryLabel="Восстановить пароль"
    />
  );
}
