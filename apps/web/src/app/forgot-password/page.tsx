import { AuthPage } from "@/components/phase02/auth-page";

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Восстановление пароля"
      description="API возвращает безопасный одинаковый ответ и не раскрывает, существует ли email."
      fields={["Email"]}
      submitLabel="Запросить reset"
      secondaryHref="/login"
      secondaryLabel="Вспомнил пароль"
    />
  );
}
