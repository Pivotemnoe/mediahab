import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function CalendarPage() {
  return (
    <PilotUnavailable
      description="В первой тестовой версии публикации отправляются только после вашей проверки и подтверждения. Планирование по времени будет добавлено после проверки ручного сценария."
      title="Календарь пока не открыт"
    />
  );
}
