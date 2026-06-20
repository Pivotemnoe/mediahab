import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { MarketingShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PublicPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  primaryHref?: string;
  primaryLabel?: string;
};

export function PublicPage({
  eyebrow,
  title,
  description,
  items,
  primaryHref = "/register",
  primaryLabel = "Регистрация",
}: PublicPageProps) {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col justify-center gap-5">
          <Badge tone="success" className="w-fit">
            {eyebrow}
          </Badge>
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold text-ink sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight size={16} />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app">Кабинет</Link>
            </Button>
          </div>
        </div>

        <Card className="grid content-start gap-3">
          {items.map((item) => (
            <div
              className="grid grid-cols-[24px_1fr] gap-3 rounded-md border border-line p-3"
              key={item}
            >
              <CheckCircle2 size={18} className="mt-0.5 text-success" />
              <div className="text-sm leading-6 text-ink">{item}</div>
            </div>
          ))}
        </Card>
      </section>
    </MarketingShell>
  );
}
