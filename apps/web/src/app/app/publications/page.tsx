import { CabinetPage } from "@/components/phase02/cabinet-page";

export default function PublicationsPage() {
  return (
    <CabinetPage
      title="Публикации"
      description="Раздел публикаций пока показывает техническую границу. Платформенные версии и отправка начинаются в следующих фазах."
      rows={[
        ["Статус", "Подготовлено место для Telegram, MAX, Instagram и ручного экспорта."],
        ["Текущая фаза", "Этап 04 работает с исходниками, медиа и голосом, но не публикует."],
      ]}
    />
  );
}
