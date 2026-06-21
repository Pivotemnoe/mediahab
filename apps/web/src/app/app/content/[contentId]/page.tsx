import { ContentStudioShell } from "@/components/phase04/content-studio-shell";
import { getContentStudioViewModel } from "@/services/content";

export default async function ContentStudioPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  const viewModel = await getContentStudioViewModel(contentId);

  return <ContentStudioShell contentId={contentId} viewModel={viewModel} />;
}
