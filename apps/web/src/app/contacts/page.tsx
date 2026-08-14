import Link from "next/link";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const contacts = [
  ["Почта", "pivo.temnoe@gmail.com", Mail],
  ["Не получается что-то сделать?", "Напиши, где остановился: на входе, записи, готовых текстах или настройках.", MessageCircle],
  ["Вопрос о данных", "Напиши отдельно, если вопрос касается доступа к кабинету или твоих материалов.", ShieldCheck],
] as const;

export default function ContactsPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div>
          <Badge tone="info">Контакты</Badge>
          <h1 className="font-editorial mt-4 text-4xl leading-tight text-foreground sm:text-6xl">Если что-то не получилось — напиши.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            Опиши, что нужно было сделать и что появилось на экране. Если можешь, приложи снимок — так будет проще разобраться.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/register">Попросить приглашение</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/security">Защита аккаунта</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-3">
          {contacts.map(([title, text, Icon]) => (
            <Card className="grid gap-2" key={title}>
              <Icon size={20} className="text-primary" />
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
              <p className="text-sm leading-6 text-muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
