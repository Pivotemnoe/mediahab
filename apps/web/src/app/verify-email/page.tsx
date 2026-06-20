import { AuthPage } from "@/components/phase02/auth-page";

export default function VerifyEmailPage() {
  return (
    <AuthPage
      title="Подтверждение email"
      description="В Phase 02 используется mock delivery token. Реальный email adapter подключается позже."
      fields={["Verification token"]}
      submitLabel="Подтвердить"
      secondaryHref="/login"
      secondaryLabel="Вернуться ко входу"
    />
  );
}
