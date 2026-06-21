export type DataMode = "api" | "fixtures";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
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
    throw new ApiRequestError(`API request failed with ${response.status}`, response.status, path);
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
  const headers = new Headers({ Accept: "application/json" });
  const { cookieHeader, csrfToken } = await getServerCookies();

  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.requireCsrf ?? true) {
    if (!csrfToken) {
      throw new ApiRequestError("CSRF token is missing", 403, path);
    }
    headers.set(process.env.CSRF_HEADER_NAME ?? "X-CSRF-Token", csrfToken);
  }

  const response = await fetch(url, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    credentials: "include",
    headers,
    method: options.method,
  });

  if (!response.ok) {
    throw new ApiRequestError(`API request failed with ${response.status}`, response.status, path);
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
