import { ProjectDetailShell } from "@/components/phase03/project-builder-shell";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectDetailShell projectId={projectId} />;
}
