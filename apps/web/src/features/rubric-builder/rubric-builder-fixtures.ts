export const rubricList = [
  ["Обзор недели", "draft", "12 полей", "v8"],
  ["Поесть до 500 рублей", "active", "9 полей", "v5"],
  ["Фаст-обзор", "active", "7 полей", "v3"],
] as const;

export const fieldPalette = [
  ["Текст", "Короткий или длинный пользовательский ввод"],
  ["Оценка", "Шкала, подпись и пояснение"],
  ["Цена", "Сумма, валюта и заметка"],
  ["Медиа", "Фото, видео, роль и порядок"],
  ["Повторяемая группа", "Блюда, напитки или позиции чека"],
  ["AI-поле", "Хук, CTA, переход или summary"],
] as const;

export const rubricFields = [
  {
    key: "venue",
    label: "Заведение и адрес",
    helper: "Название, город, улица и контекст посещения.",
    source: "пользователь",
    required: true,
    locked: true,
    limit: "120-260 знаков",
  },
  {
    key: "atmosphere",
    label: "Атмосфера и сервис",
    helper: "Посадка, музыка, ожидание, работа официантов.",
    source: "пользователь + голос",
    required: true,
    locked: true,
    limit: "350-900 знаков",
  },
  {
    key: "dishes",
    label: "Блюда",
    helper: "Повторяемый блок: название, цена, вкус, минусы, вывод.",
    source: "пользователь",
    required: true,
    locked: false,
    limit: "1-12 блоков",
  },
  {
    key: "hook",
    label: "Хук",
    helper: "Генерируется после сбора фактов, редактируется автором.",
    source: "AI",
    required: false,
    locked: false,
    limit: "до 120 знаков",
  },
] as const;

export const repeatableGroups = [
  ["Блюда", "min 1", "max 12", "название, цена, вкус, жирность, острота"],
  ["Напитки", "min 0", "max 6", "название, цена, температура, впечатление"],
] as const;

export const platformStrategies = [
  ["Telegram", "rich message", "до 4096 знаков, collage media"],
  ["MAX", "adapted text", "до 4000 знаков, ручной fallback"],
  ["Instagram", "caption", "до 2200 знаков, media-first"],
] as const;

export const styleRules = [
  "Писать на русском разговорно, без рекламной подачи.",
  "Сохранять факты и цены без изменения.",
  "Оценки объяснять через конкретные наблюдения.",
  "Хук и CTA генерировать только после заполнения фактов.",
] as const;

export const previewBlocks = [
  ["1", "Заведение и адрес", "обязательное"],
  ["2", "Атмосфера и сервис", "диктовка доступна"],
  ["3", "Блюда", "повторяемая группа"],
  ["4", "Итог", "обязательное"],
] as const;
