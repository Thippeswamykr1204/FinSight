import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import { deleteUser, exportUser, getUser, updateUser } from "./services.js";
import * as services from "./services.js";
import { login, logout, register, rotate } from "./auth.js";
import { authenticate, principal, requireMembership } from "./middleware.js";
import { sendData } from "./http.js";
import { RefreshSession } from "./models.js";

const router = Router();
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
const uuid = z.string().uuid();
const requestId = (response: Response) =>
  String(response.getHeader("X-Request-Id") ?? "unknown");
const body = <T extends z.ZodType>(schema: T, request: Request) =>
  schema.parse(request.body) as z.infer<T>;
const workspaceId = (request: Request) =>
  uuid.parse(request.params.workspaceId);
const id = (request: Request) => uuid.parse(request.params.id);
const idempotency = (request: Request) =>
  request.header("idempotency-key") ?? undefined;

const registerInput = z
  .object({
    name: z.string().trim().min(1).max(60),
    email: z.string().email().max(254),
    password: z.string().min(12).max(128),
    privacyAccepted: z.literal(true),
  })
  .strict();
const loginInput = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();
const workspaceInput = z
  .object({ name: z.string().trim().min(1).max(80) })
  .strict();
const transactionUpdate = z
  .object({
    version: z.number().int().positive(),
    data: z.record(z.string(), z.unknown()),
  })
  .strict();

router.post(
  "/auth/register",
  asyncRoute(async (request, response) =>
    sendData(
      response,
      await register(
        body(registerInput, request),
        requestId(response),
        request,
        response,
      ),
      201,
    ),
  ),
);
router.post(
  "/auth/login",
  asyncRoute(async (request, response) =>
    sendData(
      response,
      await login(
        body(loginInput, request).email,
        body(loginInput, request).password,
        request,
        response,
      ),
    ),
  ),
);
router.post(
  "/auth/refresh",
  asyncRoute(async (request, response) =>
    sendData(response, await rotate(request, response)),
  ),
);
router.post(
  "/auth/logout",
  authenticate,
  asyncRoute(async (request, response) =>
    sendData(response, await logout(principal(request), response)),
  ),
);
router.get(
  "/auth/me",
  authenticate,
  asyncRoute(async (request, response) =>
    sendData(response, await getUser(principal(request))),
  ),
);

router.get(
  "/me/export",
  authenticate,
  asyncRoute(async (request, response) =>
    sendData(
      response,
      await exportUser(principal(request), requestId(response)),
    ),
  ),
);
router.patch(
  "/me",
  authenticate,
  asyncRoute(async (request, response) => {
    const input = z
      .object({
        name: z.string().trim().min(1).max(60).optional(),
        theme: z.enum(["light", "dark"]).optional(),
        activeWorkspaceId: z.string().uuid().nullable().optional(),
      })
      .strict()
      .parse(request.body);
    return sendData(
      response,
      await updateUser(principal(request), {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.theme !== undefined ? { theme: input.theme } : {}),
        ...(input.activeWorkspaceId !== undefined
          ? { activeWorkspaceId: input.activeWorkspaceId }
          : {}),
      }),
    );
  }),
);
router.delete(
  "/me",
  authenticate,
  asyncRoute(async (request, response) => {
    const result = await deleteUser(
      principal(request),
      z
        .object({ confirmation: z.literal("DELETE MY ACCOUNT") })
        .strict()
        .parse(request.body).confirmation,
      requestId(response),
    );
    await RefreshSession.updateMany(
      { userId: principal(request).userId },
      { $set: { revokedAt: new Date() } },
    );
    return sendData(response, result);
  }),
);

router.get(
  "/workspaces",
  authenticate,
  asyncRoute(async (request, response) =>
    sendData(response, await services.listWorkspaces(principal(request))),
  ),
);
router.post(
  "/workspaces",
  authenticate,
  asyncRoute(async (request, response) =>
    sendData(
      response,
      await services.createWorkspace(
        principal(request),
        body(workspaceInput, request).name,
        requestId(response),
        idempotency(request),
      ),
      201,
    ),
  ),
);

router.get(
  "/workspaces/:workspaceId/overview",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope);
    return sendData(response, await services.overview(scope));
  }),
);
router.get(
  "/workspaces/:workspaceId/transactions",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope);
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(25),
        cursor: z.string().optional(),
        category: z.string().max(40).optional(),
        search: z.string().trim().max(80).optional(),
      })
      .parse(request.query);
    return sendData(
      response,
      await services.listTransactions(scope, {
        limit: query.limit,
        ...(query.cursor ? { cursor: query.cursor } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.search ? { search: query.search } : {}),
      }),
    );
  }),
);
router.post(
  "/workspaces/:workspaceId/transactions",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    return sendData(
      response,
      await services.createTransaction(
        scope,
        principal(request),
        request.body,
        requestId(response),
        idempotency(request),
      ),
      201,
    );
  }),
);
router.patch(
  "/workspaces/:workspaceId/transactions/:id",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    const input = transactionUpdate.parse(request.body);
    return sendData(
      response,
      await services.updateTransaction(
        scope,
        principal(request),
        id(request),
        input.version,
        input.data,
        requestId(response),
      ),
    );
  }),
);
router.delete(
  "/workspaces/:workspaceId/transactions/:id",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    const version = z
      .object({ version: z.coerce.number().int().positive() })
      .parse(request.query).version;
    return sendData(
      response,
      await services.deleteTransaction(
        scope,
        principal(request),
        id(request),
        version,
        requestId(response),
      ),
    );
  }),
);

router.get(
  "/workspaces/:workspaceId/accounts",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope);
    return sendData(response, await services.listAccounts(scope));
  }),
);
router.post(
  "/workspaces/:workspaceId/accounts",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    return sendData(
      response,
      await services.createAccount(
        scope,
        principal(request),
        request.body,
        requestId(response),
        idempotency(request),
      ),
      201,
    );
  }),
);
router.delete(
  "/workspaces/:workspaceId/accounts/:id",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    return sendData(
      response,
      await services.deleteAccount(
        scope,
        principal(request),
        id(request),
        requestId(response),
      ),
    );
  }),
);

router.get(
  "/workspaces/:workspaceId/budgets",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope);
    return sendData(response, await services.listBudgets(scope));
  }),
);
router.post(
  "/workspaces/:workspaceId/budgets",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    return sendData(
      response,
      await services.saveBudget(
        scope,
        principal(request),
        request.body,
        requestId(response),
        idempotency(request),
      ),
      201,
    );
  }),
);
router.delete(
  "/workspaces/:workspaceId/budgets/:id",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    return sendData(
      response,
      await services.deleteBudget(
        scope,
        principal(request),
        id(request),
        requestId(response),
      ),
    );
  }),
);

router.get(
  "/workspaces/:workspaceId/goals",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope);
    return sendData(response, await services.listGoals(scope));
  }),
);
router.post(
  "/workspaces/:workspaceId/goals",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    return sendData(
      response,
      await services.createGoal(
        scope,
        principal(request),
        request.body,
        requestId(response),
        idempotency(request),
      ),
      201,
    );
  }),
);
router.post(
  "/workspaces/:workspaceId/goals/:id/contributions",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    const amount = z
      .object({ amount: z.number().int().positive() })
      .parse(request.body).amount;
    return sendData(
      response,
      await services.contributeGoal(
        scope,
        principal(request),
        id(request),
        amount,
        requestId(response),
        idempotency(request),
      ),
    );
  }),
);

router.get(
  "/workspaces/:workspaceId/recurring",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope);
    return sendData(response, await services.listRecurring(scope));
  }),
);
router.post(
  "/workspaces/:workspaceId/recurring",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    return sendData(
      response,
      await services.createRecurring(
        scope,
        principal(request),
        request.body,
        requestId(response),
        idempotency(request),
      ),
      201,
    );
  }),
);
router.post(
  "/workspaces/:workspaceId/recurring/:id/record",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "write");
    return sendData(
      response,
      await services.recordRecurring(
        scope,
        principal(request),
        id(request),
        requestId(response),
        idempotency(request),
      ),
    );
  }),
);

router.get(
  "/workspaces/:workspaceId/insights",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope);
    return sendData(response, await services.workspaceInsights(scope));
  }),
);
router.get(
  "/workspaces/:workspaceId/export",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "owner");
    return sendData(
      response,
      await services.exportWorkspace(
        scope,
        principal(request),
        requestId(response),
      ),
    );
  }),
);
router.delete(
  "/workspaces/:workspaceId",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "owner");
    const confirmation = z
      .object({ confirmation: z.string().max(120) })
      .strict()
      .parse(request.body).confirmation;
    return sendData(
      response,
      await services.deleteWorkspace(
        scope,
        principal(request),
        confirmation,
        requestId(response),
      ),
    );
  }),
);

router.get(
  "/workspaces/:workspaceId/members",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope);
    return sendData(response, await services.listMembers(scope));
  }),
);
router.post(
  "/workspaces/:workspaceId/members/invite",
  authenticate,
  asyncRoute(async (request, response) => {
    const scope = workspaceId(request);
    await requireMembership(request, scope, "owner");
    const input = z
      .object({ email: z.string().email(), role: z.enum(["EDITOR", "VIEWER"]) })
      .strict()
      .parse(request.body);
    return sendData(
      response,
      await services.inviteMember(
        scope,
        principal(request),
        input,
        requestId(response),
        idempotency(request),
      ),
      201,
    );
  }),
);
router.post(
  "/invitations/accept",
  authenticate,
  asyncRoute(async (request, response) => {
    const token = z
      .object({ token: z.string().min(32).max(128) })
      .strict()
      .parse(request.body).token;
    return sendData(
      response,
      await services.acceptInvite(
        principal(request),
        token,
        requestId(response),
      ),
    );
  }),
);

export function registerRoutes(app: import("express").Express) {
  app.use("/api", router);
}
