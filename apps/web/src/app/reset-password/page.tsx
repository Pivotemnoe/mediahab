import { AuthPage } from "@/components/phase02/auth-page";

export default function ResetPasswordPage() {
  return (
    <AuthPage
      title="Новый пароль"
      description="API сброса меняет Argon2id-хеш пароля и отзывает активные сессии пользователя."
      fields={["Токен сброса", "Новый пароль"]}
      submitLabel="Сменить пароль"
      secondaryHref="/login"
      secondaryLabel="Войти"
    />
  );
}
