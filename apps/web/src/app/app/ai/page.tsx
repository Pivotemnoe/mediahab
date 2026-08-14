import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function AiPage() {
  return (
    <PilotUnavailable
      backHref="/app/content/new"
      backLabel="Создать публикацию"
      description="Работа с текстом уже встроена в создание публикации. Отдельный раздел пока не нужен и вернётся, когда в нём появятся понятные самостоятельные действия."
      title="Отдельный помощник пока не открыт"
    />
  );
}
