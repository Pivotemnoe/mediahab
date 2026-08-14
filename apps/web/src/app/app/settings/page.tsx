import { CabinetPage } from "@/components/phase02/cabinet-page";
import { getRetentionSettingsViewModel } from "@/services/retention";

export default async function SettingsPage() {
  const retention = await getRetentionSettingsViewModel();
  return (
    <CabinetPage
      title="Настройки"
      description="Здесь собраны настройки аккаунта и сроки хранения. Подачу текстов можно изменить в разделе «Мой стиль»."
      rows={[
        ["Доступ", "Во время тестирования кабинет рассчитан на одного человека."],
        ["Голос и тексты", "«Наговори» превращает запись в текст и готовит публикации только по твоей команде."],
        ...retention.rows,
      ]}
    />
  );
}
