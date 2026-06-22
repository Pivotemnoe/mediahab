export const captureSteps = [
  ["Проект", "done"],
  ["Рубрика", "done"],
  ["Создать черновик", "active"],
  ["Блюда", "next"],
  ["Проверка", "next"],
] as const;

export const recordingStates = [
  ["idle", "ожидает"],
  ["recording", "идёт запись"],
  ["paused", "пауза"],
  ["uploading", "загрузка"],
  ["transcribing", "расшифровка"],
  ["error", "ошибка"],
] as const;

export const activeCaptureBlock = {
  title: "Черновик ещё не создан",
  prompt: "Сначала создайте рабочий черновик. Запись, фото, ИИ-сборка и Telegram-публикация находятся внутри материала.",
  progress: "старт",
  duration: "00:00",
  transcript: "",
} as const;

export const offlineDraft = {
  status: "локальный черновик",
  saved: "локально сохранено 18 секунд назад",
  queue: "2 текстовых правки и 1 аудио-метаданные в очереди",
} as const;

export const resumeItems = [
  ["Последний блок", "Атмосфера и сервис"],
  ["Следующий шаг", "Блюда"],
  ["Медиа", "3 файла готовы к привязке"],
] as const;

export const reviewBlocks = [
  ["Основные сведения", "locked", "Заведение, адрес и чек подтверждены."],
  ["Атмосфера", "review", "Транскрипт ожидает правку перед фиксацией."],
  ["Блюда", "empty", "Добавьте минимум одну повторяемую позицию."],
] as const;

export const compactPreviews = [
  ["Telegram", "черновик", "расширенное сообщение, коллаж, 3 860 / 4 096"],
  ["MAX", "блокировано", "нужно сократить после сборки"],
  ["Instagram", "ручной экспорт", "подпись и ручная публикация"],
] as const;
