import { AuthPage } from "@/components/phase02/auth-page";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params?.next?.startsWith("/app") ? params.next : undefined;

  return (
    <AuthPage
      action="login"
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
      redirectTo={redirectTo}
      submitLabel="Войти"
      secondaryHref="/forgot-password"
      secondaryLabel="Восстановить пароль"
    />
  );
}
