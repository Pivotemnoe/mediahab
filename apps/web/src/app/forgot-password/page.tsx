import Link from "next/link";

import { AuthShell } from "@/components/layout/shells";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="grid gap-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-success">
            Восстановление доступа
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">
            Получить одноразовую ссылку
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Во время закрытого тестирования ссылку создаёт владелец пилота. Напишите почту своего аккаунта — пароль сообщать не нужно.
          </p>
        </div>
        <Button asChild>
          <a href="mailto:pivo.temnoe@gmail.com?subject=Восстановление доступа Наговори">
            Написать владельцу пилота
          </a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/login">Вернуться ко входу</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
