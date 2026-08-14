import { PilotUnavailable } from "@/components/layout/pilot-unavailable";
import { RubricDetailShell } from "@/components/phase03/project-builder-shell";
import { getRubricDetailViewModel } from "@/services/projects";

export default async function RubricDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; rubricId: string }>;
}) {
  const { projectId, rubricId } = await params;
  const viewModel = await getRubricDetailViewModel(projectId, rubricId);

  if (!viewModel.rawRubric) {
    return (
      <PilotUnavailable
        backHref={`/app/projects/${projectId}/rubrics`}
        backLabel="К форматам"
        description={viewModel.notice ?? "Формат не найден или у тебя нет к нему доступа."}
        title="Не удалось открыть формат"
      />
    );
  }

  return (
    <RubricDetailShell
      projectId={projectId}
      rubricId={rubricId}
      viewModel={viewModel}
    />
  );
}
