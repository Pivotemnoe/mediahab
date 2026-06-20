export const projectWizardSteps = [
  ["Идентичность", "Название, slug и направление проекта", "current"],
  ["Аудитория", "Для кого пишем и какой уровень деталей нужен", "upcoming"],
  ["Тон", "Юмор, резкость, оценки и стоп-фразы", "upcoming"],
  ["Площадки", "Telegram, MAX, Instagram, webhook и ручной экспорт", "upcoming"],
  ["Примеры", "Импорт удачных постов и медиа-референсов", "upcoming"],
  ["Рубрики", "AI-предложения и подтверждение структуры", "upcoming"],
] as const;

export const platformOptions = [
  ["Telegram", "rich message, preview, manual fallback", true],
  ["MAX", "manual/export first, production token later", true],
  ["Instagram", "manual_required до Meta readiness", false],
  ["Webhook", "simulate by default, live after SSRF controls", false],
] as const;

export const rubricSuggestions = [
  ["Поесть до 500 рублей", "Цена, вес, вкус, жирность, острота, итог", "короткий обзор"],
  ["Обзор недели", "Атмосфера, сервис, блюда, чек, вывод", "полный обзор"],
  ["Фаст-обзор", "Упаковка, вес, состав, главный минус, рекомендация", "быстрый формат"],
] as const;

export const exampleImports = [
  "Текст из Telegram",
  "Фото блюда",
  "Голосовая заметка",
] as const;
