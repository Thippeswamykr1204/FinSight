"use client";
export async function api<T>(
  path: string,
  options?: { method?: string; body?: unknown; key?: string },
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: options?.method ?? "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...(options?.key ? { "Idempotency-Key": options.key } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message ?? "The request could not be completed.",
    );
  return result.data as T;
}
