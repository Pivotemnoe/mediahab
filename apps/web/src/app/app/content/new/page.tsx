import { NewContentShell } from "@/components/phase04/content-studio-shell";
import { getNewContentViewModel } from "@/services/content";

export default async function NewContentPage() {
  const viewModel = await getNewContentViewModel();
  return <NewContentShell viewModel={viewModel} />;
}
