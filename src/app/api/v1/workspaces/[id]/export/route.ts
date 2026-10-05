import { endpoint } from "@/lib/hosted/http";
import { authorize } from "@/lib/hosted/authorization";
import { hostedDb } from "@/lib/hosted/db";
export const dynamic = "force-dynamic";
export function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (actor, requestId) => {
    const workspaceId = (await params).id;
    await authorize(actor, workspaceId, "owner");
    return hostedDb().$transaction(
      async (db) => {
        const workspace = await db.workspace.findUnique({
          where: { id: workspaceId },
          include: {
            accounts: true,
            entries: true,
            budgets: true,
            goals: true,
          },
        });
        await db.auditEvent.create({
          data: {
            workspaceId,
            actorId: actor.userId,
            action: "workspace.exported",
            requestId,
          },
        });
        return {
          format: "finsight-workspace-v1",
          exportedAt: new Date().toISOString(),
          money: {
            encoding: "integer-minor-units",
            scale: 100,
            currency: workspace?.currency,
            minorUnit: workspace?.currency === "INR" ? "paise" : "legacy cents",
          },
          workspace,
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  });
}
