import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function AiPage() {
  return (
    <PilotUnavailable
      backHref="/app/content/new"
      backLabel="Наговорить публикацию"
      description="«Наговори» уже помогает с текстом во время создания публикации — отдельный раздел для этого не нужен."
      title="Работа с текстом уже рядом"
    />
  );
}
