import { NewRubricShell } from "@/components/phase03/project-builder-shell";
import { getRubricBuilderViewModel } from "@/services/projects";

export default async function NewRubricPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const viewModel = await getRubricBuilderViewModel(projectId);

  return <NewRubricShell projectId={projectId} viewModel={viewModel} />;
}
