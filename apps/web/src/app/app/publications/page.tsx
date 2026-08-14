import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function PublicationsPage() {
  return (
    <PilotUnavailable
      backHref="/app/content"
      backLabel="Открыть все тексты"
      description="Проверить и отправить публикацию можно рядом с готовым текстом. Отдельный список отправленных публикаций появится позже."
      title="Все готовые тексты уже сохранены"
    />
  );
}
