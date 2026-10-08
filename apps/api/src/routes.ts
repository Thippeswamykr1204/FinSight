import { randomUUID } from "node:crypto";
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { getAuth } from "./auth";
import { errorHandler, HttpError, sendData } from "./http";
import { principal } from "./principal";
import {
  acceptInvitation,
  authorize,
  createWorkspace,
  deleteAccount,
  entries,
  executeCommand,
  inviteMember,
  listWorkspaces,
  overview,
  removeMember,
  financeState,
  preferences,
  savePreferences,
  createRecurrence,
  createReport,
  digest,
  deleteWorkspace,
  exportWorkspace,
} from "./services";
import {
  commandSchema,
  invitationInput,
  querySchema,
  roleInput,
  workspaceBody,
  idSchema,
  preferencesInput,
  recurrenceInput,
  reportInput,
} from "./contracts";
import {
  AuditEvent,
  Workspace,
  Membership,
  RecurringRule,
  SharedReport,
  Invitation,
} from "./models";
import { consumeLimit } from "./redis";
import { workspaceWrite } from "./repositories/unit-of-work";
import { getDb } from "./mongo";
import {
  billingProfileSchema,
  checkoutInput,
  checkoutVerification,
} from "@finsight/shared";
import {
  billingSummary,
  billingInvoice,
  saveBillingProfile,
  changeBilling,
  refreshBilling,
  verifyCheckout,
  resumeCheckout,
  requireWorkspaceFeature,
} from "./billing";

const asyncRoute =
  (
    handler: (
      request: Request,
      response: Response,
      next: NextFunction,
    ) => Promise<unknown>,
  ) =>
  (request: Request, response: Response, next: NextFunction) =>
    void handler(request, response, next).catch(next);
const api = Router();
const param = (request: Request, name: string) => {
  const value = request.params[name];
  return idSchema.parse(Array.isArray(value) ? (value[0] ?? "") : value);
};

function mutationOrigin(request: Request) {
  const origin = request.header("origin");
  if (
    origin &&
    origin !== process.env.WEB_ORIGIN &&
    origin !== process.env.API_ORIGIN
  )
    throw new HttpError(403, "FORBIDDEN", "A same-origin request is required.");
}
async function actor(request: Request) {
  return principal(request);
}
function key(request: Request) {
  const value = request.header("idempotency-key");
  if (!value || !/^[a-zA-Z0-9_-]{8,128}$/.test(value))
    throw new HttpError(422, "VALIDATION", "Supply a valid Idempotency-Key.");
  return value;
}

api.get(
  "/billing",
  asyncRoute(async (request, response) =>
    sendData(response, await billingSummary(await actor(request))),
  ),
);
api.get(
  "/billing/checkout",
  asyncRoute(async (request, response) =>
    sendData(response, await resumeCheckout(await actor(request))),
  ),
);
api.patch(
  "/billing/profile",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    return sendData(
      response,
      await saveBillingProfile(
        await actor(request),
        billingProfileSchema.parse(request.body),
      ),
    );
  }),
);
api.post(
  "/billing/checkout",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    return sendData(
      response,
      await changeBilling(
        await actor(request),
        key(request),
        "checkout",
        checkoutInput.parse(request.body).plan,
      ),
      201,
    );
  }),
);
api.post(
  "/billing/change",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    return sendData(
      response,
      await changeBilling(
        await actor(request),
        key(request),
        "change",
        checkoutInput.parse(request.body).plan,
      ),
    );
  }),
);
api.post(
  "/billing/cancel",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    z.object({}).strict().parse(request.body);
    return sendData(
      response,
      await changeBilling(await actor(request), key(request), "cancel"),
    );
  }),
);
api.post(
  "/billing/refresh",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    z.object({}).strict().parse(request.body);
    return sendData(response, await refreshBilling(await actor(request)));
  }),
);
api.post(
  "/billing/verify",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    return sendData(
      response,
      await verifyCheckout(
        await actor(request),
        checkoutVerification.parse(request.body),
      ),
    );
  }),
);
api.get(
  "/billing/invoices/:id",
  asyncRoute(async (request, response) =>
    sendData(
      response,
      await billingInvoice(await actor(request), param(request, "id")),
    ),
  ),
);

api.get(
  "/workspaces",
  asyncRoute(async (request, response) =>
    sendData(response, await listWorkspaces(await actor(request))),
  ),
);
api.post(
  "/workspaces",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const principalValue = await actor(request);
    const input = workspaceBody.parse(request.body);
    return sendData(
      response,
      await createWorkspace(
        principalValue,
        input.name,
        String(response.getHeader("X-Request-Id")),
        key(request),
      ),
      201,
    );
  }),
);
api.get(
  "/workspaces/:workspaceId/state",
  asyncRoute(async (request, response) =>
    sendData(
      response,
      await financeState(await actor(request), param(request, "workspaceId")),
    ),
  ),
);
api.get(
  "/preferences",
  asyncRoute(async (request, response) =>
    sendData(response, await preferences(await actor(request))),
  ),
);
api.patch(
  "/preferences",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    return sendData(
      response,
      await savePreferences(
        await actor(request),
        preferencesInput.parse(request.body),
      ),
    );
  }),
);
api.get(
  "/workspaces/:workspaceId/recurring",
  asyncRoute(async (request, response) => {
    const workspaceId = param(request, "workspaceId");
    await authorize(await actor(request), workspaceId);
    return sendData(
      response,
      (
        await RecurringRule.find({ workspaceId }).sort({ createdAt: 1 }).lean()
      ).map((rule) => ({ ...rule, id: String(rule._id), _id: undefined })),
    );
  }),
);
api.post(
  "/workspaces/:workspaceId/recurring",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    return sendData(
      response,
      await createRecurrence(
        await actor(request),
        param(request, "workspaceId"),
        recurrenceInput.parse(request.body),
        String(response.getHeader("X-Request-Id")),
        key(request),
      ),
      201,
    );
  }),
);
api.patch(
  "/workspaces/:workspaceId/recurring/:id",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const input = z
      .object({ enabled: z.boolean() })
      .strict()
      .parse(request.body);
    const workspaceId = param(request, "workspaceId");
    return sendData(
      response,
      await workspaceWrite(
        await actor(request),
        workspaceId,
        "write",
        async () => {
          const rule = await RecurringRule.findOneAndUpdate(
            { workspaceId, _id: param(request, "id") },
            { $set: input },
            { new: true },
          ).lean();
          if (!rule)
            throw new HttpError(404, "NOT_FOUND", "Recurring rule not found.");
          return { ...rule, id: String(rule._id), _id: undefined };
        },
      ),
    );
  }),
);
api.get(
  "/workspaces/:workspaceId/invitations",
  asyncRoute(async (request, response) => {
    const workspaceId = param(request, "workspaceId");
    await authorize(await actor(request), workspaceId, "members");
    return sendData(
      response,
      (
        await Invitation.find(
          { workspaceId, acceptedAt: null, expiresAt: { $gt: new Date() } },
          { tokenHash: 0 },
        )
          .sort({ createdAt: 1 })
          .lean()
      ).map((row) => ({ ...row, id: String(row._id), _id: undefined })),
    );
  }),
);
api.delete(
  "/workspaces/:workspaceId/invitations/:id",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const workspaceId = param(request, "workspaceId");
    const actorValue = await actor(request);
    return sendData(
      response,
      await workspaceWrite(actorValue, workspaceId, "members", async () => {
        const member = await authorize(actorValue, workspaceId, "members");
        const invitation = await Invitation.findOne({
          _id: param(request, "id"),
          workspaceId,
          acceptedAt: null,
        }).lean();
        if (!invitation)
          throw new HttpError(404, "NOT_FOUND", "Invitation not found.");
        if (invitation.role === "ADMIN" && member.role !== "OWNER")
          throw new HttpError(
            403,
            "FORBIDDEN",
            "Only the owner can revoke an administrator invitation.",
          );
        await Invitation.deleteOne({ _id: invitation._id, workspaceId });
        await AuditEvent.create({
          workspaceId,
          actorId: actorValue.userId,
          action: "invitation.revoked",
          resourceId: String(invitation._id),
          requestId: String(response.getHeader("X-Request-Id")),
        });
        return { deleted: true };
      }),
    );
  }),
);
api.delete(
  "/workspaces/:workspaceId/recurring/:id",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const workspaceId = param(request, "workspaceId");
    return sendData(
      response,
      await workspaceWrite(
        await actor(request),
        workspaceId,
        "write",
        async () => {
          const result = await RecurringRule.deleteOne({
            workspaceId,
            _id: param(request, "id"),
          });
          if (!result.deletedCount)
            throw new HttpError(404, "NOT_FOUND", "Recurring rule not found.");
          return { deleted: true };
        },
      ),
    );
  }),
);
api.post(
  "/workspaces/:workspaceId/reports",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    return sendData(
      response,
      await createReport(
        await actor(request),
        param(request, "workspaceId"),
        reportInput.parse(request.body),
        String(response.getHeader("X-Request-Id")),
      ),
      201,
    );
  }),
);
api.get(
  "/workspaces/:workspaceId/reports",
  asyncRoute(async (request, response) => {
    const workspaceId = param(request, "workspaceId");
    await authorize(await actor(request), workspaceId, "owner");
    return sendData(
      response,
      (
        await SharedReport.find(
          { workspaceId, expiresAt: { $gt: new Date() } },
          { tokenHash: 0 },
        )
          .sort({ createdAt: -1 })
          .limit(100)
          .lean()
      ).map((row) => ({ ...row, id: String(row._id), _id: undefined })),
    );
  }),
);
api.get(
  "/reports/shared/:token",
  asyncRoute(async (request, response) => {
    const token = z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .parse(param(request, "token"));
    const report = await SharedReport.findOne(
      { tokenHash: digest(token), expiresAt: { $gt: new Date() } },
      {
        start: 1,
        end: 1,
        income: 1,
        expenses: 1,
        saved: 1,
        expiresAt: 1,
        _id: 0,
      },
    ).lean();
    if (!report)
      throw new HttpError(
        404,
        "NOT_FOUND",
        "This report has expired or was removed.",
      );
    return sendData(response, report);
  }),
);
api.delete(
  "/workspaces/:workspaceId/reports/:id",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const workspaceId = param(request, "workspaceId");
    return sendData(
      response,
      await workspaceWrite(
        await actor(request),
        workspaceId,
        "owner",
        async () => {
          await SharedReport.deleteOne({
            workspaceId,
            _id: param(request, "id"),
          });
          return { deleted: true };
        },
      ),
    );
  }),
);
api.get(
  "/workspaces/:workspaceId/overview",
  asyncRoute(async (request, response) =>
    sendData(
      response,
      await overview(await actor(request), param(request, "workspaceId")),
    ),
  ),
);
api.get(
  "/workspaces/:workspaceId/transactions",
  asyncRoute(async (request, response) => {
    const input = querySchema.parse(request.query);
    return sendData(
      response,
      await entries(await actor(request), param(request, "workspaceId"), input),
    );
  }),
);
api.post(
  "/workspaces/:workspaceId/commands",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    return sendData(
      response,
      await executeCommand(
        await actor(request),
        param(request, "workspaceId"),
        key(request),
        commandSchema.parse(request.body),
        String(response.getHeader("X-Request-Id")),
      ),
    );
  }),
);
api.post(
  "/workspaces/:workspaceId/members",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const input = invitationInput.parse(request.body);
    return sendData(
      response,
      await inviteMember(
        await actor(request),
        param(request, "workspaceId"),
        input.email,
        input.role,
        String(response.getHeader("X-Request-Id")),
        key(request),
      ),
      201,
    );
  }),
);
api.patch(
  "/workspaces/:workspaceId/members/:userId",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const workspaceId = param(request, "workspaceId");
    const userId = param(request, "userId");
    const input = roleInput.parse({ ...request.body, userId });
    const principalValue = await actor(request);
    return sendData(
      response,
      await workspaceWrite(principalValue, workspaceId, "owner", async () => {
        const target = await Membership.findOne({
          workspaceId,
          userId: input.userId,
        }).lean();
        if (!target) throw new HttpError(404, "NOT_FOUND", "Member not found.");
        if (target.role === "OWNER")
          throw new HttpError(
            409,
            "CONFLICT",
            "The workspace owner cannot be demoted.",
          );
        await Membership.updateOne(
          { workspaceId, userId: input.userId },
          { role: input.role },
        );
        await Invitation.deleteMany({
          workspaceId,
          inviterId: input.userId,
          acceptedAt: null,
        });
        await AuditEvent.create({
          _id: randomUUID(),
          workspaceId,
          actorId: principalValue.userId,
          action: "member.role_changed",
          resourceId: input.userId,
          requestId: String(response.getHeader("X-Request-Id")),
        });
        return { updated: true };
      }),
    );
  }),
);
api.delete(
  "/workspaces/:workspaceId/members/:userId",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    return sendData(
      response,
      await removeMember(
        await actor(request),
        param(request, "workspaceId"),
        param(request, "userId"),
        String(response.getHeader("X-Request-Id")),
      ),
    );
  }),
);
api.get(
  "/workspaces/:workspaceId/audit",
  asyncRoute(async (request, response) => {
    const workspaceId = param(request, "workspaceId");
    await authorize(await actor(request), workspaceId, "members");
    await requireWorkspaceFeature(workspaceId, "audit");
    const rows = await AuditEvent.find({ workspaceId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(100)
      .lean();
    return sendData(response, rows);
  }),
);
api.get(
  "/workspaces/:workspaceId/export",
  asyncRoute(async (request, response) => {
    const principalValue = await actor(request);
    const workspaceId = param(request, "workspaceId");
    await authorize(principalValue, workspaceId, "owner");
    return sendData(
      response,
      await exportWorkspace(
        principalValue,
        workspaceId,
        String(response.getHeader("X-Request-Id")),
      ),
    );
  }),
);
api.delete(
  "/workspaces/:workspaceId",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const principalValue = await actor(request);
    if (!principalValue.fresh)
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Sign in again before deleting a workspace.",
      );
    const workspaceId = param(request, "workspaceId");
    await authorize(principalValue, workspaceId, "owner");
    const input = z
      .object({ confirmation: z.string().max(100) })
      .strict()
      .parse(request.body);
    return sendData(
      response,
      await deleteWorkspace(principalValue, workspaceId, input.confirmation),
    );
  }),
);

api.post(
  "/invitations/accept",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const input = z
      .object({ token: z.string().min(32).max(128) })
      .strict()
      .parse(request.body);
    return sendData(
      response,
      await acceptInvitation(
        await actor(request),
        input.token,
        String(response.getHeader("X-Request-Id")),
      ),
    );
  }),
);

api.get(
  "/me",
  asyncRoute(async (request, response) => {
    const principalValue = await actor(request);
    const users = getAuth();
    const session = await users.api.getSession({
      headers: new Headers(request.headers as Record<string, string>),
    });
    const memberships = await Membership.find({
      userId: principalValue.userId,
    }).lean();
    const workspaces = await Workspace.find({
      _id: { $in: memberships.map((entry) => entry.workspaceId) },
    }).lean();
    const byId = new Map(
      workspaces.map((workspace) => [String(workspace._id), workspace]),
    );
    return sendData(response, {
      format: "finsight-personal-data-v1",
      exportedAt: new Date().toISOString(),
      profile: session
        ? {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            emailVerified: session.user.emailVerified,
            createdAt: session.user.createdAt,
            noticeVersion: session.user.noticeVersion,
            noticeAcceptedAt: session.user.noticeAcceptedAt,
          }
        : null,
      security: {
        twoFactorEnabled: Boolean(session?.user.twoFactorEnabled),
        devices: await getDb()
          .collection("sessions")
          .find(
            { userId: principalValue.userId as never },
            {
              projection: {
                _id: 0,
                userAgent: 1,
                ipAddress: 1,
                createdAt: 1,
                expiresAt: 1,
              },
            },
          )
          .toArray(),
        passkeys: await getDb()
          .collection("passkeys")
          .find(
            { userId: principalValue.userId as never },
            { projection: { _id: 0, name: 1, createdAt: 1 } },
          )
          .toArray(),
      },
      preferences: await preferences(principalValue),
      memberships: memberships.map((entry) => ({
        ...entry,
        workspace: byId.get(entry.workspaceId),
      })),
      note: "Financial data is exported separately by workspace owners. Authentication secrets are excluded.",
    });
  }),
);
api.delete(
  "/me",
  asyncRoute(async (request, response) => {
    mutationOrigin(request);
    const input = z
      .object({ confirmation: z.literal("DELETE MY ACCOUNT") })
      .strict()
      .parse(request.body);
    return sendData(
      response,
      await deleteAccount(await actor(request), input.confirmation),
    );
  }),
);

export function registerRoutes(app: import("express").Express) {
  app.use(
    "/api/v1",
    asyncRoute(async (request, response, next) => {
      if (request.path === "/") return next();
      const identifier = request.path.startsWith("/reports/shared/")
        ? `report:${request.ip ?? "unknown"}`
        : `api:${(await actor(request)).userId}`;
      const limit = await consumeLimit(identifier, { window: 60, max: 120 });
      if (!limit.allowed) {
        response.setHeader("Retry-After", String(limit.retryAfter));
        throw new HttpError(
          429,
          "RATE_LIMITED",
          "Too many requests. Try again shortly.",
        );
      }
      next();
    }),
  );
  app.use("/api/v1", api);
  app.use(
    "/api/identity",
    asyncRoute(async (request, response) => {
      const body = ["GET", "HEAD"].includes(request.method)
        ? undefined
        : JSON.stringify(request.body ?? {});
      const headers = new Headers(request.headers as Record<string, string>);
      const result = await getAuth().handler(
        new Request(
          `${process.env.API_ORIGIN ?? "http://localhost:4000"}${request.originalUrl}`,
          { method: request.method, headers, body },
        ),
      );
      response.status(result.status);
      result.headers.forEach((value, header) => {
        if (header !== "set-cookie") response.setHeader(header, value);
      });
      const cookies = result.headers.getSetCookie();
      if (cookies.length) response.setHeader("set-cookie", cookies);
      response.send(Buffer.from(await result.arrayBuffer()));
    }),
  );
}
