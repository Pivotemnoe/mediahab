import { RubricBuilderShell } from "@/components/phase03/project-builder-shell";

export default async function ProjectRubricsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <RubricBuilderShell projectId={projectId} />;
}
