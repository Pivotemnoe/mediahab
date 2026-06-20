import { AuthPage } from "@/components/phase02/auth-page";

export default function ResetPasswordPage() {
  return (
    <AuthPage
      title="Новый пароль"
      description="Reset API меняет Argon2id password hash и отзывает активные сессии пользователя."
      fields={["Reset token", "New password"]}
      submitLabel="Сменить пароль"
      secondaryHref="/login"
      secondaryLabel="Войти"
    />
  );
}
