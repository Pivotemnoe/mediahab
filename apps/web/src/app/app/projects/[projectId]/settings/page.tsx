import { ProjectSettingsShell } from "@/components/phase03/project-builder-shell";
import { getProjectSettingsViewModel } from "@/services/projects";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const viewModel = await getProjectSettingsViewModel(projectId);

  return <ProjectSettingsShell projectId={projectId} viewModel={viewModel} />;
}
