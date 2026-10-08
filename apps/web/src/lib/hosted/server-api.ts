import { headers } from "next/headers";
export class ServerApiError extends Error {
  constructor(public status: number) {
    super(`The API request could not be completed (${status}).`);
  }
}

export async function serverApi<T>(path: string): Promise<T> {
  const incoming = await headers();
  const response = await fetch(
    `${process.env.API_URL || "http://localhost:4000"}${path}`,
    {
      headers: {
        cookie: incoming.get("cookie") ?? "",
        "x-request-id": incoming.get("x-request-id") ?? "",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) throw new ServerApiError(response.status);
  const body = (await response.json()) as { data: T };
  return body.data;
}

export type ServerMe = {
  profile: { id: string; name: string; email: string };
  memberships: Array<{
    role: string;
    workspaceId: string;
    workspace?: { name: string; currency: string };
  }>;
};

export function serverMe() {
  return serverApi<ServerMe>("/api/v1/me");
}
