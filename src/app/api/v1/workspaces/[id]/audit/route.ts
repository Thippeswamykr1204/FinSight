import { endpoint } from "@/lib/hosted/http";
import { authorize } from "@/lib/hosted/authorization";
import { hostedDb } from "@/lib/hosted/db";
export const dynamic = "force-dynamic";
export function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (actor) => {
    const workspaceId = (await params).id;
    await authorize(actor, workspaceId, "members");
    return hostedDb().auditEvent.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    });
  });
}
