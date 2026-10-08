"use client";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options?: { method?: string; body?: unknown; key?: string },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method: options?.method ?? "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...(options?.key ? { "Idempotency-Key": options.key } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      "You are offline or the service is unavailable. Reconnect and try again.",
      0,
      "OFFLINE",
    );
  }
  const result = await response.json().catch(() => ({
    error: {
      message: "The service is temporarily unavailable.",
      code: "UNAVAILABLE",
    },
  }));
  if (!response.ok) {
    if (response.status === 401)
      window.dispatchEvent(new Event("finsight:session-expired"));
    throw new ApiError(
      result.error?.message ?? "The request could not be completed.",
      response.status,
      result.error?.code ?? "REQUEST_FAILED",
    );
  }
  return result.data as T;
}
