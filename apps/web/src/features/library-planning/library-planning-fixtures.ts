export const exampleFilters = ["Все", "Одобрено", "Проверка", "Отклонено", "Рубрика"] as const;

export const exampleLibrary = [
  ["Обзор недели", "ПуриПури: интерьер спорит с кухней", "одобрено", "0.92", "5 фрагментов"],
  ["Поесть до 500 рублей", "Старый город: бизнес-ланч без режима выживания", "одобрено", "0.88", "4 фрагмента"],
  ["Фаст-обзор", "440 грамм за 250 ₽: вес есть, радости мало", "проверка", "0.74", "3 фрагмента"],
  ["Rejected pattern", "Слишком рекламная подача без фактов", "отклонено", "0.21", "negative"],
] as const;

export const mediaFilters = ["Все", "Фото", "Видео", "Голос", "Ошибки"] as const;

export const mediaLibrary = [
  ["01", "Обложка фасада", "фото", "готово", "cover", "Telegram/MAX/Instagram"],
  ["02", "Хачапури на мангале", "фото", "готово", "carousel", "Telegram/MAX/Instagram"],
  ["03", "Хинкали крупно", "фото", "warning", "carousel", "Instagram ratio review"],
  ["04", "Голос атмосфера", "голос", "transcribed", "source", "OpenAI STT"],
] as const;

export const mediaWarnings = [
  ["Instagram", "Проверьте ratio у 03 перед carousel export."],
  ["MAX", "Media count capability ждёт live spike."],
] as const;

export const calendarDays = [
  ["21 июня", "2 публикации", "Telegram 12:00, MAX manual 12:10"],
  ["22 июня", "1 публикация", "ПуриПури продолжение 15:30"],
  ["23 июня", "empty", "Свободное окно"],
  ["24 июня", "warning", "Instagram manual confirmation"],
] as const;

export const calendarQueue = [
  ["21 июня, 12:00", "Старый город: бизнес-ланч", "scheduled", "Europe/Moscow -> 09:00 UTC"],
  ["22 июня, 15:30", "ПуриПури: продолжение обзора", "rescheduled", "outbox event updated"],
  ["24 июня, 18:00", "Instagram manual package", "manual_required", "ожидает подтверждения"],
] as const;
