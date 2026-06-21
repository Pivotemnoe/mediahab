import { MediaLibraryShell } from "@/components/phase04/content-studio-shell";
import { getMediaLibraryViewModel } from "@/services/library-planning";

export default async function MediaPage() {
  const viewModel = await getMediaLibraryViewModel();

  return <MediaLibraryShell viewModel={viewModel} />;
}
