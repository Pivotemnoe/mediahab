import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function ExamplesPage() {
  return (
    <PilotUnavailable
      backHref="/app/projects"
      backLabel="Открыть каналы"
      description="У каждого канала свои примеры стиля. Выбери канал, чтобы добавить или проверить их."
      title="Выбери канал"
    />
  );
}
