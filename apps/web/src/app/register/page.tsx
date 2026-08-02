import { AuthPage } from "@/components/phase02/auth-page";

export default function RegisterPage() {
  return (
    <AuthPage
      action="register"
      eyebrow="Начало работы"
      title="Создать свой MediaHub"
      description="Укажите почту и название кабинета. Сразу после входа вы сможете создать проект и надиктовать первую идею."
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
      submitLabel="Создать кабинет"
      secondaryHref="/login"
      secondaryLabel="Уже есть аккаунт"
    />
  );
}
