import { z } from "zod";
import { body, endpoint, HttpError } from "@/lib/hosted/http";
import { hostedDb } from "@/lib/hosted/db";

export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return endpoint(request, async (actor) =>
    hostedDb().$transaction(
      async (db) => {
        const profile = await db.user.findUniqueOrThrow({
          where: { id: actor.userId },
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            image: true,
            createdAt: true,
            twoFactorEnabled: true,
            noticeAccepted: true,
            noticeVersion: true,
            noticeAcceptedAt: true,
          },
        });
        const memberships = await db.workspaceMember.findMany({
          where: { userId: actor.userId },
          select: {
            workspaceId: true,
            role: true,
            createdAt: true,
            workspace: { select: { name: true, currency: true } },
          },
        });
        const sessions = await db.session.findMany({
          where: { userId: actor.userId },
          select: {
            createdAt: true,
            expiresAt: true,
            userAgent: true,
            ipAddress: true,
          },
        });
        const passkeys = await db.passkey.findMany({
          where: { userId: actor.userId },
          select: { name: true, createdAt: true },
        });
        const emailDelivery = await db.emailOutbox.findMany({
          where: { to: actor.email },
          select: {
            subject: true,
            createdAt: true,
            sentAt: true,
            attempts: true,
          },
        });
        return {
          format: "finsight-personal-data-v1",
          exportedAt: new Date().toISOString(),
          profile,
          memberships,
          sessions,
          passkeys,
          emailDelivery,
          note: "Financial data is exported separately by each workspace owner. Authentication secrets and other members' personal data are excluded.",
        };
      },
      { isolationLevel: "RepeatableRead" },
    ),
  );
}

export function DELETE(request: Request) {
  return endpoint(request, async (actor) => {
    if (!actor.fresh)
      throw new HttpError(
        403,
        "FRESH_SESSION_REQUIRED",
        "Sign in again before deleting your account.",
      );
    await body(
      request,
      z.object({ confirmation: z.literal("DELETE MY ACCOUNT") }).strict(),
    );
    return hostedDb().$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM v2_users WHERE id = ${actor.userId} FOR UPDATE`;
      if (!(await db.session.findUnique({ where: { id: actor.sessionId } })))
        throw new HttpError(401, "SESSION_REVOKED", "Sign in again.");
      if (
        await db.workspaceMember.count({
          where: { userId: actor.userId, role: "OWNER" },
        })
      )
        throw new HttpError(
          409,
          "OWNED_WORKSPACES",
          "Export and delete your owned workspaces before deleting your account. Shared workspaces owned by others are retained.",
        );
      await db.workspaceInvitation.deleteMany({
        where: { email: actor.email },
      });
      await db.emailOutbox.deleteMany({ where: { to: actor.email } });
      await db.idempotentWrite.deleteMany({ where: { actorId: actor.userId } });
      await db.auditEvent.updateMany({
        where: { actorId: actor.userId },
        data: { actorId: "deleted-user" },
      });
      await db.auditEvent.updateMany({
        where: { resourceId: actor.userId },
        data: { resourceId: null },
      });
      await db.verification.deleteMany({
        where: { identifier: { in: [actor.userId, actor.email] } },
      });
      await db.rateBucket.deleteMany({ where: { key: `api:${actor.userId}` } });
      // FK cascades remove sessions, credentials, OAuth tokens, MFA, passkeys and memberships.
      await db.user.delete({ where: { id: actor.userId } });
      return { deleted: true };
    });
  });
}
