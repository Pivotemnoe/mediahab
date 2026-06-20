import { CabinetPage } from "@/components/phase02/cabinet-page";

export default function SettingsPage() {
  return (
    <CabinetPage
      title="Настройки"
      description="Техническая точка входа для настроек рабочего пространства, ролей и будущих провайдеров."
      rows={[
        ["Рабочее пространство", "Роли и граница доступа уже проверяются сервером."],
        ["AI и STT", "Ключи провайдеров будут добавлены отдельной фазой после подтверждения."],
      ]}
    />
  );
}
