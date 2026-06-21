import { ContentIndexShell } from "@/components/phase04/content-studio-shell";
import { getContentIndexViewModel } from "@/services/content";

export default async function ContentPage() {
  const viewModel = await getContentIndexViewModel();

  return <ContentIndexShell viewModel={viewModel} />;
}
