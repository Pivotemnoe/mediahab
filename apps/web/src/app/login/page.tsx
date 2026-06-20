import { AuthPage } from "@/components/phase02/auth-page";

export default function LoginPage() {
  return (
    <AuthPage
      title="Вход в MediaHub"
      description="Откройте рабочее пространство, черновики, публикации и настройки проекта."
      fields={[
        {
          autoComplete: "email",
          label: "Электронная почта",
          name: "email",
          placeholder: "name@example.com",
          type: "email",
        },
        {
          autoComplete: "current-password",
          label: "Пароль",
          name: "password",
          placeholder: "Введите пароль",
          type: "password",
        },
      ]}
      submitLabel="Войти"
      secondaryHref="/forgot-password"
      secondaryLabel="Восстановить пароль"
    />
  );
}
