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
      backLabel="Вернуться в проект"
      description="Основные правила проекта уже доступны на его странице. Расширенный редактор появится после проверки простого сценария."
      title="Расширенная настройка готовится"
    />
  );
}
