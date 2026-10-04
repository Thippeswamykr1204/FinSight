import { endpoint, body } from "@/lib/hosted/http";
import { hostedDb } from "@/lib/hosted/db";
import { workspaceSchema } from "@/lib/hosted/contracts";
import { createWorkspace } from "@/lib/hosted/repository";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return endpoint(request, (actor) =>
    hostedDb().workspaceMember.findMany({
      where: { userId: actor.userId },
      select: {
        role: true,
        workspace: { select: { id: true, name: true, currency: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  );
}
export function POST(request: Request) {
  return endpoint(
    request,
    async (actor, requestId) =>
      createWorkspace(
        actor,
        (await body(request, workspaceSchema)).name,
        requestId,
      ),
    201,
  );
}
