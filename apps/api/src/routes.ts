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
} from "./services";
import {
  commandSchema,
  invitationInput,
  querySchema,
  roleInput,
  workspaceBody,
} from "./contracts";
import {
  AuditEvent,
  Workspace,
  FinancialAccount,
  Transaction,
  Budget,
  Goal,
  Membership,
  IdempotencyKey,
} from "./models";

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
  return Array.isArray(value) ? (value[0] ?? "") : value;
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
      ),
      201,
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
    await authorize(principalValue, workspaceId, "owner");
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
    await AuditEvent.create({
      _id: randomUUID(),
      workspaceId,
      actorId: principalValue.userId,
      action: "member.role_changed",
      resourceId: input.userId,
      requestId: String(response.getHeader("X-Request-Id")),
    });
    return sendData(response, { updated: true });
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
    const [workspace, accounts, transactions, budgets, goals] =
      await Promise.all([
        Workspace.findById(workspaceId).lean(),
        FinancialAccount.find({ workspaceId }).lean(),
        Transaction.find({ workspaceId }).lean(),
        Budget.find({ workspaceId }).lean(),
        Goal.find({ workspaceId }).lean(),
      ]);
    return sendData(response, {
      format: "finsight-workspace-v1",
      exportedAt: new Date().toISOString(),
      money: {
        encoding: "integer-minor-units",
        scale: 100,
        currency: workspace?.currency,
        minorUnit: workspace?.currency === "INR" ? "paise" : "legacy cents",
      },
      workspace: { workspace, accounts, transactions, budgets, goals },
    });
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
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace || input.confirmation !== `DELETE ${workspace.name}`)
      throw new HttpError(
        422,
        "VALIDATION",
        "Type DELETE followed by the exact workspace name.",
      );
    await Promise.all([
      Workspace.deleteOne({ _id: workspaceId }),
      Membership.deleteMany({ workspaceId }),
      FinancialAccount.deleteMany({ workspaceId }),
      Transaction.deleteMany({ workspaceId }),
      Budget.deleteMany({ workspaceId }),
      Goal.deleteMany({ workspaceId }),
      AuditEvent.deleteMany({ workspaceId }),
      IdempotencyKey.deleteMany({ workspaceId }),
    ]);
    return sendData(response, { deleted: true });
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
      profile: session?.user,
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
      result.headers.forEach((value, header) =>
        response.setHeader(header, value),
      );
      response.send(Buffer.from(await result.arrayBuffer()));
    }),
  );
}
