import { z } from "zod";
import { endpoint, body, HttpError } from "@/lib/hosted/http";
import { authorize } from "@/lib/hosted/authorization";
import { workspaceWrite } from "@/lib/hosted/repository";

export function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return endpoint(request, async (actor) => {
    if (!actor.fresh)
      throw new HttpError(
        403,
        "FRESH_SESSION_REQUIRED",
        "Sign in again before deleting a workspace.",
      );
    const input = await body(
      request,
      z.object({ confirmation: z.string().max(100) }).strict(),
    );
    const id = (await params).id;
    return workspaceWrite(actor, id, "owner", async (db) => {
      const { workspace } = await authorize(actor, id, "owner", db);
      if (input.confirmation !== `DELETE ${workspace.name}`)
        throw new HttpError(
          422,
          "CONFIRMATION",
          "Type DELETE followed by the exact workspace name.",
        );
      // Ledger entries reference accounts with RESTRICT; remove entries before cascading accounts.
      await db.ledgerEntry.deleteMany({ where: { workspaceId: id } });
      await db.workspace.delete({ where: { id } });
      return { deleted: true };
    });
  });
}
