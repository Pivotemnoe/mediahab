import { NewProjectShell } from "@/components/phase03/project-builder-shell";
import { getNewProjectViewModel } from "@/services/projects";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams?: Promise<{ idea?: string }>;
}) {
  const params = await searchParams;
  const standaloneIdeaToken = params?.idea && UUID_PATTERN.test(params.idea) ? params.idea : undefined;
  const viewModel = await getNewProjectViewModel();
  return <NewProjectShell initialStandaloneIdeaToken={standaloneIdeaToken} viewModel={viewModel} />;
}
