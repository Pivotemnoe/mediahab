import { CabinetPage } from "@/components/phase02/cabinet-page";
import { getRetentionSettingsViewModel } from "@/services/retention";

export default async function SettingsPage() {
  const retention = await getRetentionSettingsViewModel();
  return (
    <CabinetPage
      title="Настройки"
      description="Техническая точка входа для настроек рабочего пространства, ролей и будущих провайдеров."
      rows={[
        ["Рабочее пространство", "Роли и граница доступа уже проверяются сервером."],
        ["ИИ и расшифровка", "Ключи провайдеров будут добавлены отдельной фазой после подтверждения."],
        ...retention.rows,
      ]}
    />
  );
}
