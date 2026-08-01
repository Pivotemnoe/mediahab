import { NewContentShell } from "@/components/phase04/content-studio-shell";
import { getNewContentViewModel } from "@/services/content";

export default async function NewContentPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string; pilot_error?: string; platform?: string; project?: string; rubric?: string }>;
}) {
  const params = await searchParams;
  const viewModel = await getNewContentViewModel(params?.edit);
  return (
    <NewContentShell
      initialProjectId={params?.project}
      initialPlatformKey={params?.platform}
      initialRubricId={params?.rubric}
      pilotError={params?.pilot_error}
      viewModel={viewModel}
    />
  );
}
