import Link from "next/link";

import { AuthShell } from "@/components/layout/shells";
import { AuthPage } from "@/components/phase02/auth-page";
import { Button } from "@/components/ui/button";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string; invite?: string }>;
}) {
  const params = await searchParams;
  const inviteToken = params?.invite?.trim();

  if (!inviteToken) {
    return (
      <AuthShell>
        <div className="grid gap-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-success">
              Доступ по приглашению
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">
              Нужна личная ссылка
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Сейчас «Наговори» открыт для небольшой группы. Нажми «Попросить приглашение» и напиши, для чего хочешь его попробовать.
            </p>
          </div>
          <Button asChild>
            <a href="mailto:pivo.temnoe@gmail.com?subject=Доступ к закрытому тестированию Наговори">
              Попросить приглашение
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/login">Уже есть доступ? Войти</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthPage
      action="register"
      consentRequired
      eyebrow="Твоё приглашение готово"
      title="Создай кабинет и начинай наговаривать"
      description="Ссылка сработает один раз. После входа «Наговори» быстро покажет, где наговорить публикацию, сохранить мысль и добавить примеры своего стиля."
      fields={[
        {
          autoComplete: "email",
          label: "Почта",
          name: "email",
          placeholder: "name@example.com",
          type: "email",
          value: params?.email,
        },
        {
          autoComplete: "new-password",
          helper: "Не короче 12 символов.",
          label: "Придумай новый пароль",
          name: "password",
          placeholder: "Новый пароль",
          type: "password",
        },
        {
          autoComplete: "name",
          label: "Как к тебе обращаться",
          name: "display_name",
          placeholder: "Константин",
        },
        {
          label: "Как назвать кабинет",
          name: "workspace_name",
          placeholder: "Мой блог",
        },
      ]}
      hiddenFields={{ invite_token: inviteToken }}
      submitLabel="Начать в «Наговори»"
      secondaryHref="/login"
      secondaryLabel="Уже есть доступ? Войти"
    />
  );
}
