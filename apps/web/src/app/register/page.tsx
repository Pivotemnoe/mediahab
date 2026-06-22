import { AuthPage } from "@/components/phase02/auth-page";

export default function RegisterPage() {
  return (
    <AuthPage
      action="register"
      eyebrow="Новый кабинет"
      title="Создать рабочее пространство"
      description="Заведите аккаунт владельца и первый проект для контента, диктовки и публикаций."
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
          label: "Название пространства",
          name: "workspace_name",
          placeholder: "Что поесть? Армавир",
        },
      ]}
      submitLabel="Создать аккаунт"
      secondaryHref="/login"
      secondaryLabel="Уже есть аккаунт"
    />
  );
}
