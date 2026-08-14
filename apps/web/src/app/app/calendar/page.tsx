import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function CalendarPage() {
  return (
    <PilotUnavailable
      description="Сейчас публикации отправляются только после твоей проверки. Возможность выбрать дату и время появится позже."
      title="Планирование появится позже"
    />
  );
}
