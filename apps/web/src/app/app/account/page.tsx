import { CabinetPage } from "@/components/phase02/cabinet-page";

export default function AccountPage() {
  return (
    <CabinetPage
      title="Аккаунт"
      description="Страница зарезервирована для профиля, email verification, session management и password reset."
      rows={[
        ["Identity", "Email/password, Argon2id, verified email timestamp."],
        ["Sessions", "GET /me/sessions и DELETE /me/sessions/{session_id}."],
        ["Security", "Cookie session, CSRF token, logout-all."],
      ]}
    />
  );
}
