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
              Закрытое тестирование
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">
              Вход по персональному приглашению
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Сейчас мы подключаем тестировщиков небольшими группами. Попросите владельца пилота прислать одноразовую ссылку — свободной регистрации нет.
            </p>
          </div>
          <Button asChild>
            <a href="mailto:pivo.temnoe@gmail.com?subject=Доступ к закрытому тестированию Наговори">
              Запросить приглашение
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/login">Уже есть аккаунт</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthPage
      action="register"
      consentRequired
      eyebrow="Начало работы"
      title="Создать свой кабинет в «Наговори»"
      description="Приглашение действует один раз. После входа короткое обучение покажет диктовку, блокнот, идеи и настройку стиля."
      fields={[
        {
          autoComplete: "email",
          label: "Электронная почта",
          name: "email",
          placeholder: "name@example.com",
          type: "email",
          value: params?.email,
        },
        {
          autoComplete: "new-password",
          helper: "Минимум 12 символов.",
          label: "Пароль",
          name: "password",
          placeholder: "Надёжный пароль",
          type: "password",
        },
        {
          autoComplete: "name",
          label: "Имя",
          name: "display_name",
          placeholder: "Константин",
        },
        {
          label: "Название кабинета",
          name: "workspace_name",
          placeholder: "Моя редакция",
        },
      ]}
      hiddenFields={{ invite_token: inviteToken }}
      submitLabel="Принять приглашение"
      secondaryHref="/login"
      secondaryLabel="Уже есть аккаунт"
    />
  );
}
