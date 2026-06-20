import { AuthPage } from "@/components/phase02/auth-page";

export default function VerifyEmailPage() {
  return (
    <AuthPage
      eyebrow="Почта"
      title="Подтвердить почту"
      description="Введите код подтверждения, чтобы завершить настройку аккаунта."
      fields={[
        {
          label: "Код подтверждения",
          name: "token",
          placeholder: "Код из письма",
        },
      ]}
      submitLabel="Подтвердить"
      secondaryHref="/login"
      secondaryLabel="Вернуться ко входу"
    />
  );
}
