import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${process.env.API_URL || "http://localhost:4000"}/health`,
      { headers: request.headers, cache: "no-store" },
    );
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return Response.json(
      { status: "unavailable", service: "finsight-web" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
