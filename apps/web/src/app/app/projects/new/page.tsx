import { NewProjectShell } from "@/components/phase03/project-builder-shell";
import { getNewProjectViewModel } from "@/services/projects";

export default async function NewProjectPage() {
  const viewModel = await getNewProjectViewModel();
  return <NewProjectShell viewModel={viewModel} />;
}
