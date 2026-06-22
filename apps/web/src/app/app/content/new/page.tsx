import { NewContentShell } from "@/components/phase04/content-studio-shell";
import { getNewContentViewModel } from "@/services/content";

export default async function NewContentPage({
  searchParams,
}: {
  searchParams?: Promise<{ pilot_error?: string }>;
}) {
  const viewModel = await getNewContentViewModel();
  const params = await searchParams;
  return <NewContentShell pilotError={params?.pilot_error} viewModel={viewModel} />;
}
