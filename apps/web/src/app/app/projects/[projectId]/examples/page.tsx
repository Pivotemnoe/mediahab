import { ExamplesLibraryShell } from "@/components/phase05/ai-pipeline-shell";
import { getProjectExamplesViewModel } from "@/services/ai";

type ExamplesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ExamplesPage({ params }: ExamplesPageProps) {
  const { projectId } = await params;
  const viewModel = await getProjectExamplesViewModel(projectId);
  return <ExamplesLibraryShell viewModel={viewModel} />;
}
