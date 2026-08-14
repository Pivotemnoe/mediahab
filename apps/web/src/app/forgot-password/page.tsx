import Link from "next/link";

import { AuthShell } from "@/components/layout/shells";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="grid gap-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-success">
            Не получается войти?
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">
            Получить ссылку для нового пароля
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Напиши нам с той почты, на которую зарегистрирован кабинет. Пароль отправлять не нужно — в ответ придёт личная ссылка для его замены.
          </p>
        </div>
        <Button asChild>
          <a href="mailto:pivo.temnoe@gmail.com?subject=Восстановление доступа Наговори">
            Попросить ссылку
          </a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/login">Назад ко входу</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
