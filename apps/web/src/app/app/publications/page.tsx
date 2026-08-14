import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function PublicationsPage() {
  return (
    <PilotUnavailable
      backHref="/app/content"
      backLabel="Открыть историю"
      description="Проверка и отправка доступны внутри готового материала. Отдельный журнал публикаций появится после первой тестовой группы."
      title="Журнал публикаций готовится"
    />
  );
}
