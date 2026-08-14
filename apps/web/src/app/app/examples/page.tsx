import { PilotUnavailable } from "@/components/layout/pilot-unavailable";

export default function ExamplesPage() {
  return (
    <PilotUnavailable
      backHref="/app/projects"
      backLabel="Открыть проекты"
      description="Идеальные примеры настраиваются внутри конкретного проекта. Выберите проект, чтобы добавить или проверить его примеры."
      title="Выберите проект"
    />
  );
}
