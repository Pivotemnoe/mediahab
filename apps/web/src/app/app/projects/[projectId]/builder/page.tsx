import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default async function ProjectBuilderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <PilotUnavailable
      backHref={`/app/projects/${projectId}`}
      backLabel="Вернуться в канал"
      description="Все нужные правила уже доступны на странице канала."
      title="Все настройки уже на странице канала"
    />
  );
}
