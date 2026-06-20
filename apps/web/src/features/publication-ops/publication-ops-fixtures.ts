export const connectorCards = [
  {
    name: "Telegram",
    state: "подключена",
    account: "@chto_poest_armavir",
    permissions: "публикация, медиа, правка",
    token: "активен",
    capability: "расширенное сообщение + tg-коллаж",
    tone: "success",
  },
  {
    name: "MAX",
    state: "требует внимания",
    account: "канал выбран вручную",
    permissions: "сообщение, медиа-пакет",
    token: "нужно проверить",
    capability: "сначала ручной экспорт",
    tone: "warning",
  },
  {
    name: "Instagram",
    state: "ограничено",
    account: "профиль ожидает проверки",
    permissions: "нужен ручной экспорт",
    token: "Meta readiness pending",
    capability: "подпись + пакет карусели",
    tone: "warning",
  },
  {
    name: "Универсальный вебхук",
    state: "симуляция",
    account: "список разрешённых адресов выключен",
    permissions: "только владелец/администратор",
    token: "нужна проверка endpoint",
    capability: "HMAC и HTTPS POST",
    tone: "neutral",
  },
] as const;

export const publicationQueue = [
  ["Telegram", "опубликовано", "внешний ID: tg_2049", "success"],
  ["MAX", "ошибка, будет повтор", "вложение ещё не готово, повтор через 30с", "warning"],
  ["Instagram", "нужен ручной экспорт", "пакет готов, боевой коннектор выключен", "warning"],
  ["Вебхук", "симуляция", "ответ 202 сохранён как доказательство", "neutral"],
] as const;

export const publicationAttempts = [
  ["#1", "Telegram", "опубликовано", "расширенное сообщение отправлено", "2.1с"],
  ["#1", "MAX", "ошибка, будет повтор", "вложение ещё не готово", "1.4с"],
  ["#1", "Instagram", "нужен ручной экспорт", "план контейнера готов", "0.8с"],
  ["#1", "Вебхук", "симуляция", "подписанный payload", "0.2с"],
] as const;

export const schedulePosture = {
  date: "2026-06-21",
  time: "12:30",
  timezone: "Europe/Moscow",
  retry: "5с, 30с, 2м, 10м, 30м, 2ч, 6ч, 12ч",
} as const;

export const operationStates = [
  ["частичная публикация", "Telegram опубликован, MAX ждёт повтор, Instagram требует ручной экспорт."],
  ["интеграция отключена", "Токен и возможности MAX нужно проверить перед боевым режимом."],
  ["нет прав", "Редактор не публикует без права content.publish."],
  ["нет сети", "Повторы и публикация выключены без подключения."],
] as const;
