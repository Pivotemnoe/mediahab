import { PilotUnavailable } from "@/components/layout/pilot-unavailable";
import { ProjectSettingsShell } from "@/components/phase03/project-builder-shell";
import { getProjectSettingsViewModel } from "@/services/projects";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const viewModel = await getProjectSettingsViewModel(projectId);

  if (!viewModel.project) {
    return (
      <PilotUnavailable
        backHref="/app/projects"
        backLabel="К списку каналов"
        description={viewModel.notice ?? "Канал не найден или у тебя нет к нему доступа."}
        title="Правила канала недоступны"
      />
    );
  }

  return <ProjectSettingsShell projectId={projectId} viewModel={viewModel} />;
}
