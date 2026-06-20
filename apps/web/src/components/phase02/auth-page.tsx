import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { AuthShell } from "@/components/layout/shells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AuthField = {
  autoComplete?: string;
  helper?: string;
  label: string;
  name: string;
  placeholder: string;
  type?: string;
};

type AuthPageProps = {
  description: string;
  eyebrow?: string;
  fields: AuthField[];
  secondaryHref: string;
  secondaryLabel: string;
  submitLabel: string;
  title: string;
};

export function AuthPage({
  description,
  eyebrow = "Безопасный доступ",
  fields,
  secondaryHref,
  secondaryLabel,
  submitLabel,
  title,
}: AuthPageProps) {
  return (
    <AuthShell>
      <div className="grid gap-5">
        <Badge className="w-fit" tone="success">
          {eyebrow}
        </Badge>
        <div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <LockKeyhole size={20} className="text-primary" />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        <form className="grid gap-3">
          {fields.map((field) => (
            <label className="grid gap-1.5 text-sm" key={field.name}>
              <span className="font-medium text-foreground">{field.label}</span>
              <input
                autoComplete={field.autoComplete}
                className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-ring/20"
                name={field.name}
                placeholder={field.placeholder}
                type={field.type ?? "text"}
              />
              {field.helper ? <span className="text-xs leading-5 text-muted">{field.helper}</span> : null}
            </label>
          ))}
          <Button type="button" className="mt-2">
            {submitLabel}
            <ArrowRight size={16} />
          </Button>
        </form>
        <Button asChild variant="ghost">
          <Link href={secondaryHref}>{secondaryLabel}</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
