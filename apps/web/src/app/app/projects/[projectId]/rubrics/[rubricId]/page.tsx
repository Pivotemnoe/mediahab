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
        backLabel="К списку рубрик"
        description={viewModel.notice ?? "Рубрика не найдена или у вас нет к ней доступа."}
        title="Не удалось открыть рубрику"
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
