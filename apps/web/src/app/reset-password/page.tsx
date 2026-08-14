import { AccessLinkRequired, AuthPage } from "@/components/phase02/auth-page";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  if (!params?.token) {
    return (
      <AccessLinkRequired
        description="Попросите владельца пилота создать новую ссылку для вашего аккаунта."
        title="Нужна персональная ссылка"
      />
    );
  }
  return (
    <AuthPage
      action="reset-password"
      eyebrow="Новый пароль"
      title="Задать новый пароль"
      description="Ссылка действует один раз. После смены пароля все прежние входы будут завершены."
      fields={[
        {
          autoComplete: "new-password",
          helper: "Минимум 12 символов.",
          label: "Новый пароль",
          name: "password",
          placeholder: "Новый пароль",
          type: "password",
        },
      ]}
      hiddenFields={{ token: params.token }}
      submitLabel="Сменить пароль"
      secondaryHref="/login"
      secondaryLabel="Вернуться ко входу"
    />
  );
}
