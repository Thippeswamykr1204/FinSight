import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${process.env.API_URL || "http://localhost:4000"}/ready`,
      { headers: request.headers, cache: "no-store" },
    );
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    if (process.env.HOSTED_ENABLED === "true")
      return Response.json(
        { status: "unavailable", mode: "hosted" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      { status: "ready", mode: "browser-demo" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
