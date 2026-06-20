import { CabinetPage } from "@/components/phase02/cabinet-page";

export default function WorkspacePage() {
  return (
    <CabinetPage
      title="Workspace"
      description="Workspace boundary и роли уже есть в API. Контентные сущности появятся только после этого слоя."
      rows={[
        ["Roles", "owner, admin, editor, viewer."],
        ["Tenant isolation", "Чужой workspace ID возвращает 404."],
        ["Members", "Минимальный invitation endpoint проверяет team.seats.max."],
      ]}
    />
  );
}
