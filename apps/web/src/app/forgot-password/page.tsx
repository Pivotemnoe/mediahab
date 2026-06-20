import { AuthPage } from "@/components/phase02/auth-page";

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      eyebrow="Восстановление"
      title="Сбросить пароль"
      description="Укажите почту аккаунта. Если она есть в системе, придёт ссылка для смены пароля."
      fields={[
        {
          autoComplete: "email",
          label: "Электронная почта",
          name: "email",
          placeholder: "name@example.com",
          type: "email",
        },
      ]}
      submitLabel="Запросить ссылку"
      secondaryHref="/login"
      secondaryLabel="Вернуться ко входу"
    />
  );
}
