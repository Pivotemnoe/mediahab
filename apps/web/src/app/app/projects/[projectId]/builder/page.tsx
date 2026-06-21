import { ProjectBuilderShell } from "@/components/phase03/project-builder-shell";
import { getProjectBuilderViewModel } from "@/services/projects";

export default async function ProjectBuilderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const viewModel = await getProjectBuilderViewModel(projectId);
  return <ProjectBuilderShell projectId={projectId} viewModel={viewModel} />;
}
