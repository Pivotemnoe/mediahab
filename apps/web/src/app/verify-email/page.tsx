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
        description="Откройте персональную ссылку из сообщения владельца пилота или попросите новую."
        title="Нужна персональная ссылка"
      />
    );
  }
  return (
    <AuthPage
      action="verify-email"
      eyebrow="Почта"
      title="Подтвердить почту"
      description="Нажмите «Подтвердить», чтобы завершить проверку почты. Ссылка действует один раз."
      fields={[]}
      hiddenFields={{ token: params.token }}
      submitLabel="Подтвердить"
      secondaryHref="/login"
      secondaryLabel="Вернуться ко входу"
    />
  );
}
