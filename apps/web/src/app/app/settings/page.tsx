import { CabinetPage } from "@/components/phase02/cabinet-page";
import { getRetentionSettingsViewModel } from "@/services/retention";

export default async function SettingsPage() {
  const retention = await getRetentionSettingsViewModel();
  return (
    <CabinetPage
      title="Настройки"
      description="Управляйте кабинетом, доступом команды и сроками хранения материалов. Настройки текстов находятся в разделе «Мой стиль»."
      rows={[
        ["Кабинет и команда", "Здесь задаются участники и их доступ к вашим проектам."],
        ["Редактура и диктовка", "Сервис использует подключённые владельцем кабинета средства редактуры и расшифровки."],
        ...retention.rows,
      ]}
    />
  );
}
