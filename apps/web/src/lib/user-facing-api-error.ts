type ErrorPayload = {
  error?: {
    code?: string;
  };
};

export async function userFacingApiError(
  response: Response,
  fallback = "Не удалось выполнить действие. Попробуйте ещё раз.",
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
  const code = payload?.error?.code ?? "";

  if (response.status === 401 || code.includes("authentication") || code.includes("session")) {
    return "Сессия закончилась. Обновите страницу и войдите заново.";
  }
  if (response.status === 403) {
    return "Для этого действия не хватает доступа.";
  }
  if (response.status === 409 || code.includes("version_conflict")) {
    return "Данные изменились в другой вкладке. Обновите страницу и повторите действие.";
  }
  if (response.status === 413 || code.includes("too_large")) {
    return "Файл слишком большой. Выберите файл меньшего размера.";
  }
  if (response.status === 422) {
    return "Проверьте заполненные поля и попробуйте ещё раз.";
  }
  if (response.status === 429) {
    return "Слишком много попыток подряд. Подождите немного и повторите.";
  }
  if (response.status >= 500) {
    return "Сервис временно недоступен. Ваш исходник сохранён — попробуйте ещё раз чуть позже.";
  }
  return fallback;
}
