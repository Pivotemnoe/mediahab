type ErrorPayload = {
  error?: {
    code?: string;
  };
};

export async function userFacingApiError(
  response: Response,
  fallback = "Не получилось выполнить действие. Попробуй ещё раз.",
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
  const code = payload?.error?.code ?? "";

  if (response.status === 401 || code.includes("authentication") || code.includes("session")) {
    return "Время входа закончилось. Обнови страницу и войди снова.";
  }
  if (response.status === 403) {
    return "Для этого действия у твоего аккаунта нет доступа.";
  }
  if (response.status === 409 || code.includes("version_conflict")) {
    return "Эти данные изменились в другой вкладке. Обнови страницу и повтори действие.";
  }
  if (response.status === 413 || code.includes("too_large")) {
    return "Файл слишком большой. Выбери файл меньшего размера.";
  }
  if (response.status === 422) {
    return "Проверь заполненные поля и попробуй ещё раз.";
  }
  if (response.status === 429) {
    return "Слишком много попыток подряд. Подожди немного и повтори.";
  }
  if (response.status >= 500) {
    return "«Наговори» временно недоступен. Твоя исходная мысль сохранена — попробуй ещё раз чуть позже.";
  }
  return fallback;
}
