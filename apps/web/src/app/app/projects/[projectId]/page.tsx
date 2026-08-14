import { PilotUnavailable } from "@/components/layout/pilot-unavailable";
import { ProjectDetailShell } from "@/components/phase03/project-builder-shell";
import { getProjectDetailViewModel } from "@/services/projects";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const viewModel = await getProjectDetailViewModel(projectId);
  if (!viewModel.summaryCards.length) {
    return (
      <PilotUnavailable
        backHref="/app/projects"
        backLabel="К списку проектов"
        description={viewModel.notice ?? "Проект не найден или у вас нет к нему доступа."}
        title="Не удалось открыть проект"
      />
    );
  }
  return <ProjectDetailShell projectId={projectId} viewModel={viewModel} />;
}
