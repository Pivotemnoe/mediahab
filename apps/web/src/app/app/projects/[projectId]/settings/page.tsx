import { ProjectSettingsShell } from "@/components/phase03/project-builder-shell";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <ProjectSettingsShell projectId={projectId} />;
}
