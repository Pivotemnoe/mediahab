import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { AuthShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <AuthShell>
      <div className="grid gap-4">
        <Badge className="w-fit" tone="success">
          Этап 02
        </Badge>
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <LockKeyhole size={18} className="text-primary" />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        <form className="grid gap-3">
          {fields.map((field) => (
            <label className="grid gap-1 text-sm" key={field}>
              <span className="font-medium text-foreground">{field}</span>
              <input
                className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
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
      </div>
    </AuthShell>
  );
}
