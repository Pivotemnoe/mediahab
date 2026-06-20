import { AuthPage } from "@/components/phase02/auth-page";

export default function ResetPasswordPage() {
  return (
    <AuthPage
      eyebrow="Новый пароль"
      title="Задать новый пароль"
      description="Введите токен из письма и новый пароль для аккаунта."
      fields={[
        {
          label: "Токен сброса",
          name: "token",
          placeholder: "Код из письма",
        },
        {
          autoComplete: "new-password",
          helper: "После смены пароля активные сессии будут закрыты.",
          label: "Новый пароль",
          name: "password",
          placeholder: "Новый пароль",
          type: "password",
        },
      ]}
      submitLabel="Сменить пароль"
      secondaryHref="/login"
      secondaryLabel="Вернуться ко входу"
    />
  );
}
