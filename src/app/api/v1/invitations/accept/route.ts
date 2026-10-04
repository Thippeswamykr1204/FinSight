import { z } from "zod";
import { createHash } from "node:crypto";
import { endpoint, body, HttpError } from "@/lib/hosted/http";
import { hostedDb } from "@/lib/hosted/db";

export function POST(request: Request) {
  return endpoint(request, async (actor, requestId) => {
    const input = await body(
      request,
      z.object({ token: z.string().min(32).max(128) }).strict(),
    );
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    return hostedDb().$transaction(async (db) => {
      const invite = await db.workspaceInvitation.findUnique({
        where: { tokenHash },
      });
      if (
        !invite ||
        invite.email !== actor.email.toLowerCase() ||
        invite.acceptedAt ||
        invite.expiresAt <= new Date()
      )
        throw new HttpError(
          404,
          "INVITATION_UNAVAILABLE",
          "Invitation is invalid, expired, already used, or belongs to another email.",
        );
      await db.$queryRaw`SELECT id FROM v2_workspaces WHERE id = ${invite.workspaceId} FOR UPDATE`;
      const accepted = await db.workspaceInvitation.updateMany({
        where: {
          id: invite.id,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { acceptedAt: new Date() },
      });
      if (accepted.count !== 1)
        throw new HttpError(
          409,
          "INVITATION_USED",
          "This invitation has already been used.",
        );
      if (
        (await db.workspaceMember.count({
          where: { workspaceId: invite.workspaceId },
        })) >= 20
      )
        throw new HttpError(
          422,
          "MEMBER_LIMIT",
          "This workspace has reached its member limit.",
        );
      await db.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId: actor.userId,
          },
        },
        create: {
          workspaceId: invite.workspaceId,
          userId: actor.userId,
          role: invite.role,
        },
        update: {},
      });
      await db.auditEvent.create({
        data: {
          workspaceId: invite.workspaceId,
          actorId: actor.userId,
          action: "member.joined",
          requestId,
        },
      });
      return { workspaceId: invite.workspaceId };
    });
  });
}
