export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "finsight",
      version: "2.0.0",
      mode: process.env.HOSTED_ENABLED === "true" ? "hosted" : "browser-demo",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
