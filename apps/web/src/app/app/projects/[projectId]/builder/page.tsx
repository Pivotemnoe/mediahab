import { ProjectBuilderShell } from "@/components/phase03/project-builder-shell";

export default async function ProjectBuilderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectBuilderShell projectId={projectId} />;
}
