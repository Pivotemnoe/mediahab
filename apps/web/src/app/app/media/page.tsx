import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function MediaPage() {
  return (
    <PilotUnavailable
      backHref="/app/content/new"
      backLabel="Наговорить публикацию"
      description="Сейчас фото и видео добавляются прямо к публикации. Общая библиотека файлов появится позже."
      title="Добавляй фото и видео к публикации"
    />
  );
}
