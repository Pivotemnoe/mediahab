import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PilotUnavailable({
  backHref = "/app",
  backLabel = "На главную",
  description,
  title,
}: {
  backHref?: string;
  backLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <Card className="mx-auto grid w-full max-w-2xl justify-items-start gap-4 border-dashed p-6 sm:p-8">
      <div className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--primary),transparent_90%)] text-primary">
        <Clock3 size={22} />
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>
      <Button asChild variant="secondary">
        <Link href={backHref}>
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
      </Button>
    </Card>
  );
}
