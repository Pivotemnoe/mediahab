import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function MediaPage() {
  return (
    <PilotUnavailable
      backHref="/app/content/new"
      backLabel="Создать публикацию"
      description="Фото и видео пока добавляются прямо во время создания публикации. Общая медиатека появится после проверки этого сценария с первыми пользователями."
      title="Медиатека готовится"
    />
  );
}
