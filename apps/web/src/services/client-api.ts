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
    let message = `Сервер вернул ошибку ${response.status}.`;
    let code = "api_error";
    try {
      const payload = (await response.json()) as { error?: { code?: string; message?: string } };
      message = payload.error?.message || message;
      code = payload.error?.code || code;
    } catch {
      // Keep the normalized fallback.
    }
    if (code === "limit_exceeded") {
      message = "На текущем тарифе уже создано максимальное количество проектов.";
    }
    throw new ClientApiError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}
