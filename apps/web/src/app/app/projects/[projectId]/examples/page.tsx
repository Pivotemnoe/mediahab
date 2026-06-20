import { ExamplesLibraryShell } from "@/components/phase05/ai-pipeline-shell";

type ExamplesPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ExamplesPage({ params }: ExamplesPageProps) {
  const { projectId } = await params;
  return <ExamplesLibraryShell projectId={projectId} />;
}
