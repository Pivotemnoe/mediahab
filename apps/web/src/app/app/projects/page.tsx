import { ProjectIndexShell } from "@/components/phase03/project-builder-shell";
import { getProjectIndexViewModel } from "@/services/projects";

export default async function ProjectsPage() {
  const viewModel = await getProjectIndexViewModel();

  return <ProjectIndexShell viewModel={viewModel} />;
}
