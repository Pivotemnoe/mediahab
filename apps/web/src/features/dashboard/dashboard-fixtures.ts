export const dashboardStats = [
  { label: "Проекты", value: "1", note: "Что поесть? Армавир" },
  { label: "Черновики", value: "6", note: "2 требуют фактов" },
  { label: "Запланировано", value: "3", note: "ближайшее сегодня в 18:00" },
] as const;

export const recentDrafts = [
  ["Старый город: бизнес-ланч", "Рубрика «Поесть до 500 рублей»", "готов к вариантам"],
  ["ПуриПури: сет за 590 ₽", "Продолжение обзора", "нужна проверка остроты"],
  ["BBQ: хаш и шашлык", "Обзор недели", "ожидает фото"],
] as const;

export const scheduledPublications = [
  ["Telegram", "Сегодня, 18:00", "запланировано"],
  ["MAX", "Завтра, 11:30", "ручной экспорт"],
  ["Instagram", "После проверки", "нужен ручной экспорт"],
] as const;

export const integrationAlerts = [
  ["Telegram", "готов к расширенному сообщению", "success"],
  ["MAX", "нужен боевой токен", "warning"],
  ["Instagram", "ожидает готовности Meta", "warning"],
] as const;

export const usageRows = [
  ["ИИ-генерации", 62, 250, "warning"],
  ["Расшифровка, мин", 18, 120, "neutral"],
  ["Проекты", 1, 3, "success"],
] as const;
