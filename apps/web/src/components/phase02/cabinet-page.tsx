import Link from "next/link";
import { CreditCard, Settings, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type CabinetPageProps = {
  title: string;
  description: string;
  rows: Array<[string, string]>;
};

export function CabinetPage({ title, description, rows }: CabinetPageProps) {
  return (
    <main className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/app" className="text-sm font-semibold text-ink">
            Кабинет
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href="/app/account">
                <UserRound size={16} />
                Аккаунт
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/app/workspace">
                <Settings size={16} />
                Workspace
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/billing">
                <CreditCard size={16} />
                Billing
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-8">
        <div>
          <Badge className="w-fit" tone="success">
            Phase 02
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-ink">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {description}
          </p>
        </div>
        <Card className="grid gap-3">
          {rows.map(([label, value]) => (
            <div
              className="grid gap-1 rounded-md border border-line p-3 sm:grid-cols-[220px_1fr]"
              key={label}
            >
              <div className="text-sm font-medium text-muted">{label}</div>
              <div className="text-sm text-ink">{value}</div>
            </div>
          ))}
        </Card>
      </section>
    </main>
  );
}
