import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { closeDatabase, connectDatabase } from "./db.js";
import { closeRateLimiter } from "./limits.js";

const app = createApp();
const password = "Correct horse battery staple 123!";

async function register(email: string) {
  const agent = request.agent(app);
  const response = await agent
    .post("/api/auth/register")
    .send({ name: "Taylor", email, password, privacyAccepted: true });
  expect(response.status).toBe(201);
  const csrfCookie = (
    response.headers["set-cookie"] as unknown as string[]
  ).find((cookie) => cookie.startsWith("finsight_csrf="));
  const csrf = csrfCookie?.split(";", 1)[0]?.split("=", 2)[1];
  if (!csrf) throw new Error("CSRF cookie was not issued");
  return { agent, csrf };
}

describe("FinSight API", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await connectDatabase();
  });
  afterAll(async () => {
    await closeRateLimiter();
    await closeDatabase();
  });

  it("supports a real account, workspace, account and idempotent transaction", async () => {
    const { agent, csrf } = await register(`api-${Date.now()}@example.test`);
    const refreshed = await agent.post("/api/auth/refresh");
    expect(refreshed.status).toBe(200);
    const createdWorkspace = await agent
      .post("/api/workspaces")
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", "workspace-key-001")
      .send({ name: "Everyday money" });
    expect(createdWorkspace.status).toBe(201);
    const workspaceId = createdWorkspace.body.data.id as string;
    const repeatedWorkspace = await agent
      .post("/api/workspaces")
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", "workspace-key-001")
      .send({ name: "Everyday money" });
    expect(repeatedWorkspace.status).toBe(201);
    expect(repeatedWorkspace.body.data.id).toBe(workspaceId);
    const account = await agent
      .post(`/api/workspaces/${workspaceId}/accounts`)
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", "account-key-001")
      .send({ name: "Primary", type: "Savings", openingBalance: 100000 });
    expect(account.status).toBe(201);
    const budget = await agent
      .post(`/api/workspaces/${workspaceId}/budgets`)
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", "budget-key-001")
      .send({ category: "Groceries", month: "2026-10", limit: 50000 });
    expect(budget.status).toBe(201);
    expect(budget.body.data.category).toBe("Groceries");
    const transactionBody = {
      merchant: "Grocery store",
      amount: 1250,
      date: "2026-10-21",
      type: "expense",
      category: "Groceries",
      accountId: account.body.data.id,
      note: "Weekly shop",
    };
    const transaction = await agent
      .post(`/api/workspaces/${workspaceId}/transactions`)
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", "transaction-key-001")
      .send(transactionBody);
    expect(transaction.status).toBe(201);
    const repeated = await agent
      .post(`/api/workspaces/${workspaceId}/transactions`)
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", "transaction-key-001")
      .send(transactionBody);
    expect(repeated.status).toBe(201);
    expect(repeated.body.data.id).toBe(transaction.body.data.id);
    const overview = await agent.get(`/api/workspaces/${workspaceId}/overview`);
    expect(overview.status).toBe(200);
    expect(overview.body.data.accounts[0].balance).toBe(98750);
    const page = await agent.get(
      `/api/workspaces/${workspaceId}/transactions?limit=10`,
    );
    expect(page.body.data.items).toHaveLength(1);
    const concurrentReads = await Promise.all(
      Array.from({ length: 8 }, () =>
        agent.get(`/api/workspaces/${workspaceId}/overview`),
      ),
    );
    expect(concurrentReads.every((response) => response.status === 200)).toBe(
      true,
    );
  });

  it("does not allow one user to read another user's workspace", async () => {
    const owner = await register(`owner-${Date.now()}@example.test`);
    const outsider = await register(`outsider-${Date.now()}@example.test`);
    const workspace = await owner.agent
      .post("/api/workspaces")
      .set("X-CSRF-Token", owner.csrf)
      .set("Idempotency-Key", "workspace-key-002")
      .send({ name: "Private records" });
    const response = await outsider.agent.get(
      `/api/workspaces/${workspace.body.data.id}/overview`,
    );
    expect(response.status).toBe(404);
  });

  it("rejects a stale transaction update", async () => {
    const registered = await register(`stale-${Date.now()}@example.test`);
    const agent = registered.agent;
    const workspace = await agent
      .post("/api/workspaces")
      .set("X-CSRF-Token", registered.csrf)
      .set("Idempotency-Key", "workspace-key-003")
      .send({ name: "Stale check" });
    const workspaceId = workspace.body.data.id as string;
    const account = await agent
      .post(`/api/workspaces/${workspaceId}/accounts`)
      .set("X-CSRF-Token", registered.csrf)
      .set("Idempotency-Key", "account-key-003")
      .send({ name: "Cash", type: "Cash", openingBalance: 0 });
    const transaction = await agent
      .post(`/api/workspaces/${workspaceId}/transactions`)
      .set("X-CSRF-Token", registered.csrf)
      .set("Idempotency-Key", "transaction-key-003")
      .send({
        merchant: "Coffee",
        amount: 500,
        date: "2026-10-21",
        type: "expense",
        category: "Dining",
        accountId: account.body.data.id,
        note: "",
      });
    const response = await agent
      .patch(
        `/api/workspaces/${workspaceId}/transactions/${transaction.body.data.id}`,
      )
      .set("X-CSRF-Token", registered.csrf)
      .send({
        version: 99,
        data: {
          merchant: "Changed",
          amount: 500,
          date: "2026-10-21",
          type: "expense",
          category: "Dining",
          accountId: account.body.data.id,
          note: "",
        },
      });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("STALE_VERSION");
  });

  it("revokes only the session that signs out", async () => {
    const email = `logout-${Date.now()}@example.test`;
    const current = await register(email);
    const otherDevice = request.agent(app);
    const login = await otherDevice
      .post("/api/auth/login")
      .send({ email, password });
    expect(login.status).toBe(200);

    const loggedOut = await current.agent.post("/api/auth/logout");
    expect(loggedOut.status).toBe(200);
    expect((await current.agent.get("/api/auth/me")).status).toBe(401);
    expect((await otherDevice.get("/api/auth/me")).status).toBe(200);
  });

  it("blocks browser mutations without the CSRF header", async () => {
    const registered = await register(`csrf-${Date.now()}@example.test`);
    const workspace = await registered.agent
      .post("/api/workspaces")
      .set("X-CSRF-Token", registered.csrf)
      .set("Idempotency-Key", "workspace-key-004")
      .send({ name: "CSRF check" });
    const response = await registered.agent
      .post(`/api/workspaces/${workspace.body.data.id}/accounts`)
      .set("Idempotency-Key", "account-key-004")
      .send({ name: "Should fail", type: "Cash", openingBalance: 0 });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CSRF_BLOCKED");
  });
});
