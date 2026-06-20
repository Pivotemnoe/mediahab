import { RubricBuilderShell } from "@/components/phase03/project-builder-shell";
import { getRubricBuilderViewModel } from "@/services/projects";

export default async function ProjectRubricsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const viewModel = await getRubricBuilderViewModel(projectId);

  return <RubricBuilderShell projectId={projectId} viewModel={viewModel} />;
}
