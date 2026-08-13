import { StandaloneIdeaGenerator } from "@/components/phase12/standalone-idea-generator";
import { getStandaloneIdeasViewModel } from "@/services/standalone-ideas";

export default async function IdeasPage() {
  const viewModel = await getStandaloneIdeasViewModel();
  return <StandaloneIdeaGenerator notice={viewModel.notice} workspaceId={viewModel.workspaceId} />;
}
