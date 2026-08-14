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
        description="Получи ссылку на странице восстановления. Если старая больше не работает, попроси новую."
        title="Открой ссылку для смены пароля"
      />
    );
  }
  return (
    <AuthPage
      action="reset-password"
      eyebrow="Смена пароля"
      title="Придумай новый пароль"
      description="Ссылка сработает один раз. После сохранения на других устройствах нужно будет войти заново."
      fields={[
        {
          autoComplete: "new-password",
          helper: "Не короче 12 символов.",
          label: "Новый пароль",
          name: "password",
          placeholder: "Новый пароль",
          type: "password",
        },
      ]}
      hiddenFields={{ token: params.token }}
      submitLabel="Сохранить новый пароль"
      secondaryHref="/login"
      secondaryLabel="Назад ко входу"
    />
  );
}
