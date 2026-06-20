import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

type CabinetPageProps = {
  title: string;
  description: string;
  rows: Array<[string, string]>;
};

export function CabinetPage({ title, description, rows }: CabinetPageProps) {
  return (
    <div className="grid gap-4">
      <PageHeader description={description} eyebrow="Этап 02" title={title} />
      <section className="grid gap-4">
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
    </div>
  );
}
