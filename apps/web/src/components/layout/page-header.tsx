import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

type PageHeaderProps = {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className="flex max-w-full flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-full">
        {eyebrow ? (
          <Badge className="mb-3" tone="info">
            {eyebrow}
          </Badge>
        ) : null}
        <h1 className="break-words text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
