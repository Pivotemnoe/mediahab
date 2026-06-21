import { AiPipelineShell } from "@/components/phase05/ai-pipeline-shell";
import { getAiPipelineViewModel } from "@/services/ai";

export default async function AiPage() {
  const viewModel = await getAiPipelineViewModel();
  return <AiPipelineShell viewModel={viewModel} />;
}
