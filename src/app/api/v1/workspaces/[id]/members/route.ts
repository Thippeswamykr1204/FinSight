import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { after } from "next/server";
import { endpoint, body, HttpError } from "@/lib/hosted/http";
import { authorize } from "@/lib/hosted/authorization";
import { workspaceWrite } from "@/lib/hosted/repository";
import { invitationSchema, memberRoleSchema } from "@/lib/hosted/contracts";
import { hostedConfig } from "@/lib/hosted/config";
import { encryptSecret } from "@/lib/hosted/encryption";
import { deliverEmailBatch } from "@/lib/hosted/email";
type Params = { params: Promise<{ id: string }> };

export function POST(request: Request, { params }: Params) {
  return endpoint(
    request,
    async (actor, requestId) => {
      const workspaceId = (await params).id;
      const input = await body(request, invitationSchema);
      const response = await workspaceWrite(
        actor,
        workspaceId,
        "members",
        async (db) => {
          const membership = await authorize(actor, workspaceId, "members", db);
          if (input.role === "ADMIN" && membership.role !== "OWNER")
            throw new HttpError(
              403,
              "OWNER_REQUIRED",
              "Only an owner can invite an administrator.",
            );
          if (
            (await db.workspaceMember.count({ where: { workspaceId } })) >= 20
          )
            throw new HttpError(
              422,
              "MEMBER_LIMIT",
              "This release supports up to 20 members per workspace.",
            );
          if (
            await db.workspaceMember.findFirst({
              where: { workspaceId, user: { email: input.email } },
            })
          )
            throw new HttpError(
              409,
              "ALREADY_MEMBER",
              "This person is already a member.",
            );
          const token = randomBytes(32).toString("base64url");
          await db.workspaceInvitation.deleteMany({
            where: { workspaceId, email: input.email, acceptedAt: null },
          });
          const invitation = await db.workspaceInvitation.create({
            data: {
              workspaceId,
              ...input,
              tokenHash: createHash("sha256").update(token).digest("hex"),
              expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
          });
          const url = `${hostedConfig().origin}/app/invitations?token=${token}`;
          await db.emailOutbox.create({
            data: {
              to: input.email,
              subject: "You are invited to a FinSight workspace",
              text: encryptSecret(
                `${actor.name} invited you to ${membership.workspace.name} as ${input.role.toLowerCase()}.\n\nSign in with ${input.email}, then open:\n${url}\n\nThis invitation expires in 3 days.`,
              ),
            },
          });
          await db.auditEvent.create({
            data: {
              workspaceId,
              actorId: actor.userId,
              action: "member.invited",
              resourceId: invitation.id,
              requestId,
            },
          });
          return {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
          };
        },
      );
      after(async () => {
        try {
          await deliverEmailBatch(5);
        } catch {
          console.error(
            JSON.stringify({ event: "invitation_delivery_deferred" }),
          );
        }
      });
      return response;
    },
    201,
  );
}

export function PATCH(request: Request, { params }: Params) {
  return endpoint(request, async (actor, requestId) => {
    const workspaceId = (await params).id;
    const input = await body(request, memberRoleSchema);
    return workspaceWrite(actor, workspaceId, "owner", async (db) => {
      const target = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: input.userId } },
      });
      if (!target)
        throw new HttpError(404, "MEMBER_NOT_FOUND", "Member not found.");
      if (target.role === "OWNER")
        throw new HttpError(
          409,
          "OWNER_PROTECTED",
          "The workspace owner cannot be demoted.",
        );
      await db.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: input.userId } },
        data: { role: input.role },
      });
      await db.auditEvent.create({
        data: {
          workspaceId,
          actorId: actor.userId,
          action: "member.role_changed",
          resourceId: input.userId,
          requestId,
        },
      });
      return { updated: true };
    });
  });
}

export function DELETE(request: Request, { params }: Params) {
  return endpoint(request, async (actor, requestId) => {
    const workspaceId = (await params).id;
    const input = await body(
      request,
      z.object({ userId: z.string().min(1).max(100) }).strict(),
    );
    return workspaceWrite(actor, workspaceId, "members", async (db) => {
      const caller = await authorize(actor, workspaceId, "members", db);
      const target = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: input.userId } },
      });
      if (!target)
        throw new HttpError(404, "MEMBER_NOT_FOUND", "Member not found.");
      if (
        target.role === "OWNER" ||
        (target.role === "ADMIN" && caller.role !== "OWNER")
      )
        throw new HttpError(
          403,
          "OWNER_REQUIRED",
          "Only the owner can remove an administrator. Owners cannot be removed.",
        );
      await db.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId, userId: input.userId } },
      });
      await db.auditEvent.create({
        data: {
          workspaceId,
          actorId: actor.userId,
          action: "member.removed",
          resourceId: input.userId,
          requestId,
        },
      });
      return { removed: true };
    });
  });
}
