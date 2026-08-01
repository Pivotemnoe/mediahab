import { AuthPage } from "@/components/phase02/auth-page";

export default function RegisterPage() {
  return (
    <AuthPage
      action="register"
      eyebrow="Регистрация"
      title="Создать аккаунт Media Hub"
      description="Введите свою почту, придумайте пароль и название кабинета. После регистрации вы сразу войдёте в приложение; письмо подтверждения в текущем тесте не требуется."
      fields={[
        {
          autoComplete: "email",
          label: "Электронная почта",
          name: "email",
          placeholder: "name@example.com",
          type: "email",
        },
        {
          autoComplete: "new-password",
          helper: "Минимум 12 символов для рабочего режима.",
          label: "Пароль",
          name: "password",
          placeholder: "Надёжный пароль",
          type: "password",
        },
        {
          autoComplete: "name",
          label: "Имя",
          name: "display_name",
          placeholder: "Константин",
        },
        {
          label: "Название кабинета",
          name: "workspace_name",
          placeholder: "Моя редакция",
        },
      ]}
      submitLabel="Создать аккаунт"
      secondaryHref="/login"
      secondaryLabel="Уже есть аккаунт"
    />
  );
}
