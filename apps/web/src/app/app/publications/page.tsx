import { PublicationCoreShell } from "@/components/phase06/publication-core-shell";
import { getPublicationOpsViewModel } from "@/services/publications";

export default async function PublicationsPage() {
  const viewModel = await getPublicationOpsViewModel();

  return <PublicationCoreShell viewModel={viewModel} />;
}
