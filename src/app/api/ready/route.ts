import { isHostedEnabled } from "@/lib/hosted/config";
import { hostedDb } from "@/lib/hosted/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (isHostedEnabled())
      await Promise.all([
        hostedDb().workspace.count(),
        hostedDb().user.findFirst({ select: { noticeVersion: true } }),
        hostedDb().financialAccount.findFirst({ select: { dueDate: true } }),
      ]);
    return Response.json(
      { status: "ready", mode: isHostedEnabled() ? "hosted" : "browser-demo" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
