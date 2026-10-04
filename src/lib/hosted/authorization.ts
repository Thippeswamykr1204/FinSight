import type { Prisma, WorkspaceRole } from "@/generated/hosted";
import { hostedDb } from "./db";
import { HttpError, type Principal } from "./http";

export type Permission = "read" | "write" | "members" | "owner";
export function allows(role: WorkspaceRole, permission: Permission) {
  return (
    permission === "read" ||
    (permission === "write" && role !== "VIEWER") ||
    (permission === "members" && ["OWNER", "ADMIN"].includes(role)) ||
    (permission === "owner" && role === "OWNER")
  );
}
export async function authorize(
  actor: Principal,
  workspaceId: string,
  permission: Permission = "read",
  db: Prisma.TransactionClient = hostedDb(),
) {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: actor.userId } },
    include: { workspace: true },
  });
  if (!membership)
    throw new HttpError(404, "WORKSPACE_NOT_FOUND", "Workspace not found.");
  if (!allows(membership.role, permission))
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Your workspace role does not allow this action.",
    );
  return membership;
}
