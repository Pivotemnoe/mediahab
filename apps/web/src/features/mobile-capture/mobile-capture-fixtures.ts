export const captureSteps = [
  ["Проект", "done"],
  ["Рубрика", "done"],
  ["Атмосфера", "active"],
  ["Блюда", "next"],
  ["Review", "next"],
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
  title: "Атмосфера и сервис",
  prompt: "Опишите посадку, музыку, ожидание, работу официантов и общее ощущение от места.",
  progress: "3 из 7",
  duration: "01:42",
  transcript:
    "Музыка местами играла слишком громко, потом её выключили. В зале было красиво, но официантов приходилось искать глазами.",
} as const;

export const offlineDraft = {
  status: "offline draft",
  saved: "локально сохранено 18 секунд назад",
  queue: "2 текстовых правки и 1 audio metadata в очереди",
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
  ["Telegram", "draft", "Rich Message, collage, 3 860 / 4 096"],
  ["MAX", "blocked", "Нужно сократить после сборки"],
  ["Instagram", "manual", "Caption + manual_required"],
] as const;
