import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AuthPageProps = {
  title: string;
  description: string;
  fields: string[];
  submitLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export function AuthPage({
  title,
  description,
  fields,
  submitLabel,
  secondaryHref,
  secondaryLabel,
}: AuthPageProps) {
  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-6 px-4 py-8 lg:grid-cols-[1fr_420px]">
        <section>
          <Badge className="w-fit" tone="success">
            Этап 02
          </Badge>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-normal text-ink">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            {description}
          </p>
        </section>

        <Card className="grid gap-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{title}</div>
            <LockKeyhole size={18} className="text-accent" />
          </div>
          <form className="grid gap-3">
            {fields.map((field) => (
              <label className="grid gap-1 text-sm" key={field}>
                <span className="font-medium text-ink">{field}</span>
                <input
                  className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-accent"
                  placeholder={field}
                />
              </label>
            ))}
            <Button type="button" className="mt-1">
              {submitLabel}
            </Button>
          </form>
          <Button asChild variant="ghost">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </Card>
      </div>
    </main>
  );
}
