import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function forward(request: NextRequest, path: string) {
  const base = process.env.API_URL || "http://localhost:4000";
  const headers = new Headers(request.headers);
  headers.delete("host");
  const response = await fetch(
    `${base}/api/v1/${path}${request.nextUrl.search}`,
    {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    },
  );
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export const GET = (
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) => context.params.then(({ path }) => forward(request, path.join("/")));
export const POST = GET;
export const PATCH = GET;
export const DELETE = GET;
