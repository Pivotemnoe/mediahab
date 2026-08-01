import { ExamplesLibraryShell } from "@/components/phase05/ai-pipeline-shell";
import { getProjectExamplesViewModel } from "@/services/ai";

type ExamplesPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ rubric?: string }>;
};

export default async function ExamplesPage({ params, searchParams }: ExamplesPageProps) {
  const { projectId } = await params;
  const query = await searchParams;
  const viewModel = await getProjectExamplesViewModel(projectId);
  return <ExamplesLibraryShell initialRubricId={query?.rubric} viewModel={viewModel} />;
}
