import { RubricDetailShell } from "@/components/phase03/project-builder-shell";
import { getRubricDetailViewModel } from "@/services/projects";

export default async function RubricDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; rubricId: string }>;
}) {
  const { projectId, rubricId } = await params;
  const viewModel = await getRubricDetailViewModel(projectId, rubricId);

  return (
    <RubricDetailShell
      projectId={projectId}
      rubricId={rubricId}
      viewModel={viewModel}
    />
  );
}
