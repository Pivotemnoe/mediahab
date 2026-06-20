import { AuthPage } from "@/components/phase02/auth-page";

export default function LoginPage() {
  return (
    <AuthPage
      title="Вход"
      description="Сервер уже принимает вход по электронной почте и паролю и выдаёт отзывную cookie-сессию. Подключение живой формы будет следующим шагом интерфейса."
      fields={["Электронная почта", "Пароль"]}
      submitLabel="Войти"
      secondaryHref="/forgot-password"
      secondaryLabel="Восстановить пароль"
    />
  );
}
