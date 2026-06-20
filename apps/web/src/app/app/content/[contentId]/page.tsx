import { ContentStudioShell } from "@/components/phase04/content-studio-shell";

export default async function ContentStudioPage({
  params,
}: {
  params: Promise<{ contentId: string }>;
}) {
  const { contentId } = await params;
  return <ContentStudioShell contentId={contentId} />;
}
