import { AccessLinkRequired, AuthPage } from "@/components/phase02/auth-page";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  if (!params?.token) {
    return (
      <AccessLinkRequired
        description="Открой личную ссылку из сообщения. Если она больше не работает, попроси новую."
        title="Открой ссылку из сообщения"
      />
    );
  }
  return (
    <AuthPage
      action="verify-email"
      eyebrow="Остался один шаг"
      title="Подтверди свою почту"
      description="Нажми кнопку ниже — ссылка сработает только один раз."
      fields={[]}
      hiddenFields={{ token: params.token }}
      submitLabel="Подтвердить почту"
      secondaryHref="/login"
      secondaryLabel="Назад ко входу"
    />
  );
}
