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
      eyebrow="С возвращением"
      title="Войти в «Наговори»"
      description="Продолжи сохранённый текст или наговори новую мысль."
      fields={[
        {
          autoComplete: "email",
          label: "Почта",
          name: "email",
          placeholder: "name@example.com",
          type: "email",
        },
        {
          autoComplete: "current-password",
          label: "Пароль",
          name: "password",
          placeholder: "Твой пароль",
          type: "password",
        },
      ]}
      redirectTo={redirectTo}
      submitLabel="Войти"
      secondaryHref="/register"
      secondaryLabel="Ещё нет доступа? Попросить приглашение"
      tertiaryHref="/forgot-password"
      tertiaryLabel="Не помню пароль"
    />
  );
}
