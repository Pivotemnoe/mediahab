import { AuthPage } from "@/components/phase02/auth-page";

export default function VerifyEmailPage() {
  return (
    <AuthPage
      title="Подтверждение почты"
      description="На этапе 02 используется токен доставки-заглушка. Реальный адаптер электронной почты подключается позже."
      fields={["Токен подтверждения"]}
      submitLabel="Подтвердить"
      secondaryHref="/login"
      secondaryLabel="Вернуться ко входу"
    />
  );
}
