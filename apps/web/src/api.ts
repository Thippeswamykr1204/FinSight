const API_ORIGIN = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

function csrfToken() {
  const match = document.cookie.match(/(?:^|; )finsight_csrf=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const method = init.method ?? "GET";
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method))
    headers.set("X-CSRF-Token", csrfToken());
  const response = await fetch(`${API_ORIGIN}/api${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    const refresh = await fetch(`${API_ORIGIN}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": csrfToken() },
    });
    if (refresh.ok) return request<T>(path, init, false);
    window.dispatchEvent(new Event("finsight:session-expired"));
  }
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: {
      code?: string;
      message?: string;
      fields?: Record<string, string[]>;
    };
  };
  if (!response.ok)
    throw new ApiError(
      response.status,
      payload.error?.code ?? "REQUEST_FAILED",
      payload.error?.message ?? "Request failed.",
      payload.error?.fields,
    );
  return payload.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown, key?: string) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...(key ? { headers: { "Idempotency-Key": key } } : {}),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string, body?: unknown, query = "") =>
    request<T>(`${path}${query}`, {
      method: "DELETE",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
};

export function idempotencyKey() {
  return crypto.randomUUID().replaceAll("-", "");
}
