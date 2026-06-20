import { AuthPage } from "@/components/phase02/auth-page";

export default function RegisterPage() {
  return (
    <AuthPage
      title="Регистрация"
      description="Registration API создаёт пользователя, owner workspace, membership, Free subscription, session и email verification token."
      fields={["Email", "Password", "Display name", "Workspace name"]}
      submitLabel="Создать аккаунт"
      secondaryHref="/login"
      secondaryLabel="Уже есть аккаунт"
    />
  );
}
