import { ProjectDetailShell } from "@/components/phase03/project-builder-shell";
import { getProjectDetailViewModel } from "@/services/projects";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const viewModel = await getProjectDetailViewModel(projectId);
  return <ProjectDetailShell projectId={projectId} viewModel={viewModel} />;
}
