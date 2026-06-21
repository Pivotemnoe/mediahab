export type DataMode = "api" | "fixtures";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly code: string = "api_error",
    readonly details: Record<string, unknown> = {},
    readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function errorFromResponse(response: Response, path: string): Promise<ApiRequestError> {
  try {
    const payload = await response.json() as {
      error?: {
        code?: unknown;
        details?: unknown;
        message?: unknown;
        request_id?: unknown;
      };
    };
    const error = payload.error;
    if (error && typeof error === "object") {
      const code = typeof error.code === "string" ? error.code : "api_error";
      const message = typeof error.message === "string" ? error.message : `API request failed with ${response.status}`;
      const details = error.details && typeof error.details === "object" && !Array.isArray(error.details)
        ? error.details as Record<string, unknown>
        : {};
      const requestId = typeof error.request_id === "string" ? error.request_id : null;
      return new ApiRequestError(message, response.status, path, code, details, requestId);
    }
  } catch {
    // Non-JSON errors are normalized below.
  }

  return new ApiRequestError(`API request failed with ${response.status}`, response.status, path);
}

export function getDataMode(): DataMode {
  return process.env.NEXT_PUBLIC_DATA_MODE === "api" ? "api" : "fixtures";
}

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
}

async function getServerCookies(): Promise<{
  cookieHeader?: string;
  csrfToken?: string;
}> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString() || undefined;
    const csrfCookieName = process.env.CSRF_COOKIE_NAME ?? "tmh_csrf";
    const csrfToken = cookieStore.get(csrfCookieName)?.value;
    return { cookieHeader, csrfToken };
  } catch {
    return {};
  }
}

export function createApiRequestHeaders(options: {
  body?: unknown;
  cookieHeader?: string;
  csrfHeaderName?: string;
  csrfToken?: string;
  path: string;
  requireCsrf?: boolean;
}): Headers {
  const headers = new Headers({ Accept: "application/json" });

  if (options.cookieHeader) {
    headers.set("Cookie", options.cookieHeader);
  }
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.requireCsrf ?? true) {
    if (!options.csrfToken) {
      throw new ApiRequestError("CSRF token is missing", 403, options.path, "csrf_required");
    }
    headers.set(options.csrfHeaderName ?? "X-CSRF-Token", options.csrfToken);
  }

  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`;
  const headers = new Headers({ Accept: "application/json" });
  const { cookieHeader } = await getServerCookies();

  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const response = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw await errorFromResponse(response, path);
  }

  return response.json() as Promise<T>;
}

export async function apiRequest<T>(
  path: string,
  options: {
    body?: unknown;
    method: "DELETE" | "PATCH" | "POST" | "PUT";
    requireCsrf?: boolean;
  },
): Promise<T> {
  const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`;
  const { cookieHeader, csrfToken } = await getServerCookies();
  const headers = createApiRequestHeaders({
    body: options.body,
    cookieHeader,
    csrfHeaderName: process.env.CSRF_HEADER_NAME,
    csrfToken,
    path,
    requireCsrf: options.requireCsrf,
  });

  const response = await fetch(url, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    credentials: "include",
    headers,
    method: options.method,
  });

  if (!response.ok) {
    throw await errorFromResponse(response, path);
  }

  return response.json() as Promise<T>;
}

export async function safeApiGet<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path);
  } catch {
    return null;
  }
}
