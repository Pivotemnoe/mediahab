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

async function getServerCookieHeader(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const value = cookieStore.toString();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`;
  const headers = new Headers({ Accept: "application/json" });
  const cookieHeader = await getServerCookieHeader();

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

export async function safeApiGet<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path);
  } catch {
    return null;
  }
}
