import { AuthPage } from "@/components/phase02/auth-page";

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Восстановление пароля"
      description="API возвращает безопасный одинаковый ответ и не раскрывает, существует ли электронная почта."
      fields={["Электронная почта"]}
      submitLabel="Запросить сброс"
      secondaryHref="/login"
      secondaryLabel="Вспомнил пароль"
    />
  );
}
