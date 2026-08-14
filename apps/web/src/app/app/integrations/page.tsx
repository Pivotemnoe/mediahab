import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function IntegrationsPage() {
  return (
    <PilotUnavailable
      description="Подключение площадок выполняется владельцем во время подготовки тестового доступа. Самостоятельное управление подключениями откроется после пилота."
      title="Подключения настраивает владелец"
    />
  );
}
