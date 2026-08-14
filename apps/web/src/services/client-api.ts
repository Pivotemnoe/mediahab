export class ClientApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = "api_error",
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

function csrfToken(): string | null {
  const cookieName = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "tmh_csrf";
  const match = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${cookieName}=`));
  return match ? decodeURIComponent(match.slice(cookieName.length + 1)) : null;
}

export async function clientApiRequest<T>(
  path: string,
  options: { body?: unknown; method: "DELETE" | "PATCH" | "POST" | "PUT" },
): Promise<T> {
  const token = csrfToken();
  if (!token) {
    throw new ClientApiError("Сессия страницы устарела. Обновите страницу и войдите заново.", 403, "csrf_required");
  }
  const response = await fetch(path, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    method: options.method,
  });
  if (!response.ok) {
    let code = "api_error";
    try {
      const payload = (await response.json()) as { error?: { code?: string } };
      code = payload.error?.code || code;
    } catch {
      // Keep the normalized fallback.
    }
    const message = clientErrorMessage(response.status, code);
    throw new ClientApiError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}

function clientErrorMessage(status: number, code: string): string {
  if (code === "limit_exceeded") {
    return "На текущем тарифе уже создано максимальное количество проектов.";
  }
  if (status === 401 || code.includes("authentication") || code.includes("session")) {
    return "Сессия закончилась. Обновите страницу и войдите заново.";
  }
  if (status === 403) {
    return "Для этого действия не хватает доступа.";
  }
  if (status === 404) {
    return "Нужный материал не найден. Обновите страницу.";
  }
  if (status === 409 || code.includes("version_conflict")) {
    return "Данные изменились в другой вкладке. Обновите страницу и повторите действие.";
  }
  if (status === 413 || code.includes("too_large")) {
    return "Файл слишком большой. Выберите файл меньшего размера.";
  }
  if (status === 422) {
    return "Проверьте заполненные поля и попробуйте ещё раз.";
  }
  if (status === 429) {
    return "Слишком много попыток подряд. Подождите немного и повторите.";
  }
  if (status >= 500) {
    return "Сервис временно недоступен. Попробуйте ещё раз чуть позже.";
  }
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}
