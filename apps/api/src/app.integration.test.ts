import { createHmac, randomBytes, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localDate } from "@finsight/shared";
import { createApp } from "./app";
import { connectMongo, disconnectMongo, getDb } from "./mongo";
import { connectRedis, redis } from "./redis";
import { decryptSecret, encryptSecret } from "./encryption";
import {
  BillingAccount,
  BillingInvoice,
  BillingWebhook,
  Membership,
  RecurringRule,
  SharedReport,
  Transaction,
  WorkspaceUsage,
} from "./models";
import { runRecurrences } from "./services";

let mongo: StartedTestContainer;
let cache: StartedTestContainer;
let app: ReturnType<typeof createApp>;
type Agent = ReturnType<typeof request.agent>;
let owner: Agent, stranger: Agent, viewer: Agent;
let ownerId: string, strangerId: string, viewerId: string;
let workspaceId: string, accountId: string;
const origin = "http://localhost:3000";
const password = `Test-${randomBytes(18).toString("base64url")}`;
const command = (
  agent: Agent,
  body: unknown,
  key = randomUUID(),
  workspace = workspaceId,
) =>
  agent
    .post(`/api/v1/workspaces/${workspace}/commands`)
    .set("Origin", origin)
    .set("Idempotency-Key", key)
    .send(body);

async function signup(name: string) {
  const email = `${name}-${randomUUID()}@example.test`.toLowerCase();
  const agent = request.agent(app);
  const registered = await agent
    .post("/api/identity/sign-up/email")
    .set("Origin", origin)
    .send({ name, email, password, noticeAccepted: true });
  expect(registered.status, JSON.stringify(registered.body)).toBe(200);
  const emailRow = await getDb()
    .collection("email_outbox")
    .findOne({ to: email });
  expect(emailRow).toBeTruthy();
  const text = decryptSecret(emailRow!.body);
  const url = new URL(text.match(/https?:\/\/\S+/)![0]);
  const verified = await agent.get(`${url.pathname}${url.search}`);
  expect([200, 302]).toContain(verified.status);
  const session = await agent
    .post("/api/identity/sign-in/email")
    .set("Origin", origin)
    .send({ email, password });
  expect(session.status, JSON.stringify(session.body)).toBe(200);
  return { agent, id: String(session.body.user.id) };
}

beforeAll(async () => {
  // Real disposable services, isolated from any developer/production database.
  mongo = await new GenericContainer("mongo:8")
    .withCommand(["mongod", "--replSet", "rs0", "--bind_ip_all"])
    .withExposedPorts(27017)
    .withStartupTimeout(60_000)
    .start();
  await mongo.exec([
    "mongosh",
    "--quiet",
    "--eval",
    "rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]}); for(let i=0;i<200;i++){if(db.hello().isWritablePrimary)break;sleep(100);} if(!db.hello().isWritablePrimary)quit(1);",
  ]);
  cache = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .start();
  process.env.MONGODB_URI = `mongodb://${mongo.getHost()}:${mongo.getMappedPort(27017)}/integration?replicaSet=rs0&directConnection=true`;
  process.env.REDIS_URL = `redis://${cache.getHost()}:${cache.getMappedPort(6379)}`;
  process.env.WEB_ORIGIN = origin;
  process.env.API_ORIGIN = "http://localhost:4000";
  process.env.HOSTED_LOCAL = "true";
  await connectMongo();
  await connectRedis();
  app = createApp();
  ({ agent: owner, id: ownerId } = await signup("Owner"));
  ({ agent: stranger, id: strangerId } = await signup("Stranger"));
  ({ agent: viewer, id: viewerId } = await signup("Viewer"));
}, 120_000);
afterAll(async () => {
  if (mongoose.connection.readyState) await disconnectMongo();
  if (cache) await redis().quit();
  if (mongo) await mongo.stop();
  if (cache) await cache.stop();
}, 60_000);

describe("real replica-set API and billing boundaries", () => {
  it("requires a verified session and reports actual service readiness", async () => {
    expect((await request(app).get("/api/v1/workspaces")).status).toBe(401);
    expect((await owner.get("/ready")).body.data.status).toBe("ready");
    expect((await owner.get("/api/v1/billing")).body.data).toMatchObject({
      enabled: false,
      plan: "free",
      subscription: null,
      invoices: [],
      profile: null,
    });
  });
  it("starts empty and binds workspace idempotency to payload and owner", async () => {
    expect((await owner.get("/api/v1/workspaces")).body.data).toEqual([]);
    const key = randomUUID();
    const created = await owner
      .post("/api/v1/workspaces")
      .set("Origin", origin)
      .set("Idempotency-Key", key)
      .send({ name: "Test ledger" });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    workspaceId = created.body.data.id;
    const replay = await owner
      .post("/api/v1/workspaces")
      .set("Origin", origin)
      .set("Idempotency-Key", key)
      .send({ name: "Test ledger" });
    expect(replay.body.data.id).toBe(workspaceId);
    expect(
      (
        await owner
          .post("/api/v1/workspaces")
          .set("Idempotency-Key", key)
          .send({ name: "Other ledger" })
      ).status,
    ).toBe(409);
    expect(
      (
        await owner
          .post("/api/v1/workspaces")
          .set("Idempotency-Key", randomUUID())
          .send({ name: "Second ledger" })
      ).status,
    ).toBe(422);
    const state = (await owner.get(`/api/v1/workspaces/${workspaceId}/state`))
      .body.data.state;
    expect(state.accounts).toEqual([]);
    expect(state.transactions).toEqual([]);
    expect(state.budgets).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(
      (await stranger.get(`/api/v1/workspaces/${workspaceId}/state`)).status,
    ).toBe(404);
  });
  it("creates exact-paise records and protects replay keys and versions", async () => {
    const account = await command(owner, {
      action: "account.create",
      data: {
        name: "Manual bank",
        type: "Savings",
        openingBalance: 0,
        dueDate: null,
      },
    });
    expect(account.status, JSON.stringify(account.body)).toBe(200);
    accountId = account.body.data.id;
    const body = {
      action: "transaction.create",
      data: {
        accountId,
        merchant: "Test payment",
        amount: 101,
        date: localDate(),
        type: "expense",
        category: "Groceries",
        note: "",
      },
    };
    const key = randomUUID();
    const created = await command(owner, body, key);
    expect(created.status, JSON.stringify(created.body)).toBe(200);
    expect((await command(owner, body, key)).body.data.id).toBe(
      created.body.data.id,
    );
    expect(
      (
        await command(
          owner,
          { ...body, data: { ...body.data, amount: 102 } },
          key,
        )
      ).status,
    ).toBe(409);
    expect(await Transaction.countDocuments({ workspaceId })).toBe(1);
    const updated = await command(owner, {
      action: "transaction.update",
      id: created.body.data.id,
      version: 1,
      data: { ...body.data, amount: 102 },
    });
    expect(updated.body.data.version).toBe(2);
    expect(
      (
        await command(owner, {
          action: "transaction.delete",
          id: created.body.data.id,
          version: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await stranger
          .post(`/api/v1/workspaces/${workspaceId}/commands`)
          .set("Idempotency-Key", randomUUID())
          .send(body)
      ).status,
    ).toBe(404);
  });
  it("enforces viewer and Free feature access on the server", async () => {
    await Membership.create({ workspaceId, userId: viewerId, role: "VIEWER" });
    expect(
      (
        await command(viewer, {
          action: "goal.create",
          data: { name: "Forbidden goal", target: 100, due: "2027-01-01" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await owner
          .post(`/api/v1/workspaces/${workspaceId}/members`)
          .set("Idempotency-Key", randomUUID())
          .send({ email: "invite@example.test", role: "EDITOR" })
      ).status,
    ).toBe(422);
    expect(
      (await owner.get(`/api/v1/workspaces/${workspaceId}/audit`)).status,
    ).toBe(403);
    expect(
      (
        await owner
          .post(`/api/v1/workspaces/${workspaceId}/reports`)
          .send({ start: "2026-01-01", end: "2026-12-31" })
      ).status,
    ).toBe(403);
  });
  it("rolls back imports with a foreign account and deduplicates actual saved rows", async () => {
    const row = {
      accountId,
      merchant: "Import test",
      amount: 4321,
      date: localDate(),
      type: "expense",
      category: "Groceries",
      note: "",
    };
    const imported = await command(owner, {
      action: "transaction.import",
      rows: [row, row],
    });
    expect(imported.body.data).toEqual({ imported: 1, duplicates: 1 });
    const replay = await command(owner, {
      action: "transaction.import",
      rows: [row],
    });
    expect(replay.body.data).toEqual({ imported: 0, duplicates: 1 });
    const count = await Transaction.countDocuments({ workspaceId });
    expect(
      (
        await command(owner, {
          action: "transaction.import",
          rows: [
            { ...row, merchant: "Should roll back" },
            { ...row, accountId: randomUUID() },
          ],
        })
      ).status,
    ).toBe(404);
    expect(await Transaction.countDocuments({ workspaceId })).toBe(count);
  });
  it("serializes concurrent quota writes and does not refund deleted-entry usage", async () => {
    await WorkspaceUsage.updateOne(
      { workspaceId, month: localDate().slice(0, 7) },
      { transactions: 99 },
      { upsert: true },
    );
    const body = (merchant: string) => ({
      action: "transaction.create",
      data: {
        accountId,
        merchant,
        amount: 100,
        date: localDate(),
        type: "expense",
        category: "Groceries",
        note: "",
      },
    });
    const responses = await Promise.all([
      command(owner, body("Concurrent A")),
      command(owner, body("Concurrent B")),
    ]);
    expect(responses.map((result) => result.status).sort()).toEqual([200, 403]);
    const accepted = responses.find((result) => result.status === 200)!;
    expect(
      (
        await command(owner, {
          action: "transaction.delete",
          id: accepted.body.data.id,
          version: 1,
        })
      ).status,
    ).toBe(200);
    expect((await command(owner, body("After deletion"))).body.error.code).toBe(
      "MONTHLY_TRANSACTION_LIMIT",
    );
    expect((await WorkspaceUsage.findOne({ workspaceId })).transactions).toBe(
      100,
    );
  });
  it("executes a persisted paid recurrence once under competing workers and pauses on expiry", async () => {
    // A persisted entitlement fixture tests local jobs; no provider/payment is simulated.
    await BillingAccount.create({
      _id: strangerId,
      paidPlan: "pro",
      paidThrough: new Date(Date.now() + 86_400_000),
    });
    const created = await stranger
      .post("/api/v1/workspaces")
      .set("Origin", origin)
      .set("Idempotency-Key", randomUUID())
      .send({ name: "Recurrence integration" });
    expect(created.status).toBe(201);
    const workspace = created.body.data.id;
    try {
      const account = await command(
        stranger,
        {
          action: "account.create",
          data: {
            name: "Recurring bank",
            type: "Savings",
            openingBalance: 0,
            dueDate: null,
          },
        },
        randomUUID(),
        workspace,
      );
      const body = {
        frequency: "monthly",
        nextDue: "2026-01-31",
        endDate: "2026-03-31",
        transaction: {
          accountId: account.body.data.id,
          merchant: "Monthly rule",
          amount: 12345,
          date: "2026-01-31",
          type: "expense",
          category: "Groceries",
          note: "",
        },
      };
      const key = randomUUID();
      const create = () =>
        stranger
          .post(`/api/v1/workspaces/${workspace}/recurring`)
          .set("Origin", origin)
          .set("Idempotency-Key", key)
          .send(body);
      const rule = await create();
      expect(rule.status).toBe(201);
      expect((await create()).body.data.id).toBe(rule.body.data.id);
      await Promise.all([
        runRecurrences("2026-01-31"),
        runRecurrences("2026-01-31"),
      ]);
      expect(await Transaction.countDocuments({ workspaceId: workspace })).toBe(
        1,
      );
      expect((await RecurringRule.findById(rule.body.data.id))!.nextDue).toBe(
        "2026-02-28",
      );
      await BillingAccount.updateOne(
        { _id: strangerId },
        { paidThrough: new Date(0) },
      );
      await runRecurrences("2026-02-28");
      expect(await Transaction.countDocuments({ workspaceId: workspace })).toBe(
        1,
      );
      await BillingAccount.updateOne(
        { _id: strangerId },
        { paidThrough: new Date(Date.now() + 86_400_000) },
      );
      await runRecurrences("2026-02-28");
      expect((await RecurringRule.findById(rule.body.data.id))!.nextDue).toBe(
        "2026-03-31",
      );
      expect(
        (
          await Transaction.find({ workspaceId: workspace })
            .sort({ date: 1 })
            .lean()
        ).map((row) => [row.date, row.amount]),
      ).toEqual([
        ["2026-01-31", 12345],
        ["2026-02-28", 12345],
      ]);
      expect(
        (await WorkspaceUsage.findOne({ workspaceId: workspace }))!
          .transactions,
      ).toBe(2);
    } finally {
      await stranger
        .delete(`/api/v1/workspaces/${workspace}`)
        .set("Origin", origin)
        .send({ confirmation: "DELETE Recurrence integration" });
      await BillingAccount.deleteOne({ _id: strangerId });
    }
  });
  it("shares immutable summary totals without ledger details and enforces revocation and expiry", async () => {
    await BillingAccount.create({
      _id: strangerId,
      paidPlan: "pro",
      paidThrough: new Date(Date.now() + 86_400_000),
    });
    const created = await stranger
      .post("/api/v1/workspaces")
      .set("Origin", origin)
      .set("Idempotency-Key", randomUUID())
      .send({ name: "Report integration" });
    expect(created.status).toBe(201);
    const workspace = created.body.data.id;
    try {
      const account = await command(
        stranger,
        {
          action: "account.create",
          data: {
            name: "Private bank",
            type: "Savings",
            openingBalance: 0,
            dueDate: null,
          },
        },
        randomUUID(),
        workspace,
      );
      const body = {
        action: "transaction.create",
        data: {
          accountId: account.body.data.id,
          merchant: "Private merchant",
          amount: 12345,
          date: localDate(),
          type: "expense",
          category: "Groceries",
          note: "Private note",
        },
      };
      expect(
        (await command(stranger, body, randomUUID(), workspace)).status,
      ).toBe(200);
      const share = () =>
        stranger
          .post(`/api/v1/workspaces/${workspace}/reports`)
          .set("Origin", origin)
          .send({ start: localDate(), end: localDate() });
      const report = await share();
      expect(report.status).toBe(201);
      const token = new URL(report.body.data.url).pathname.split("/").pop();
      const read = () => request(app).get(`/api/v1/reports/shared/${token}`);
      const summary = (await read()).body.data;
      expect(summary).toMatchObject({
        income: 0,
        expenses: 12345,
        saved: -12345,
      });
      expect(JSON.stringify(summary)).not.toMatch(
        /Private|merchant|accountId|workspaceId/,
      );
      expect(
        (await command(stranger, body, randomUUID(), workspace)).status,
      ).toBe(200);
      expect((await read()).body.data).toEqual(summary);
      expect(
        (
          await owner
            .delete(
              `/api/v1/workspaces/${workspace}/reports/${report.body.data.id}`,
            )
            .set("Origin", origin)
        ).status,
      ).toBe(404);
      expect(
        (
          await stranger
            .delete(
              `/api/v1/workspaces/${workspace}/reports/${report.body.data.id}`,
            )
            .set("Origin", origin)
        ).status,
      ).toBe(200);
      expect((await read()).status).toBe(404);
      const expires = await share();
      await SharedReport.updateOne(
        { _id: expires.body.data.id },
        { expiresAt: new Date(0) },
      );
      const expiredToken = new URL(expires.body.data.url).pathname
        .split("/")
        .pop();
      expect(
        (await request(app).get(`/api/v1/reports/shared/${expiredToken}`))
          .status,
      ).toBe(404);
    } finally {
      await stranger
        .delete(`/api/v1/workspaces/${workspace}`)
        .set("Origin", origin)
        .send({ confirmation: "DELETE Report integration" });
      await BillingAccount.deleteOne({ _id: strangerId });
    }
  });
  it("validates billing details and stores them encrypted", async () => {
    const profile = {
      name: "Test customer",
      address: "Private test address",
      city: "Mumbai",
      postalCode: "400001",
      stateCode: "27",
      gstin: "27AAPFU0939F1ZV",
    };
    expect(
      (
        await owner
          .patch("/api/v1/billing/profile")
          .send({ ...profile, stateCode: "29" })
      ).status,
    ).toBe(422);
    expect(
      (await owner.patch("/api/v1/billing/profile").send(profile)).status,
    ).toBe(200);
    const stored = await BillingAccount.findById(ownerId).lean();
    expect(stored!.profile).not.toContain(profile.address);
    expect((await owner.get("/api/v1/billing")).body.data.profile).toEqual(
      profile,
    );
    expect(
      (
        await owner
          .post("/api/v1/billing/checkout")
          .set("Idempotency-Key", randomUUID())
          .send({ plan: "pro" })
      ).body.error.code,
    ).toBe("BILLING_DISABLED");
    expect(
      (
        await owner.post("/api/v1/billing/verify").send({
          razorpay_payment_id: "pay_notOwned",
          razorpay_subscription_id: "sub_notOwned",
          razorpay_signature: "a".repeat(64),
        })
      ).body.error.code,
    ).toBe("INVALID_PAYMENT_SIGNATURE");
  });
  it("authorizes invoice reads by payer and excludes encrypted parties from lists", async () => {
    const paymentId = `pay_${randomBytes(7).toString("hex")}`;
    const now = new Date();
    const invoice = await BillingInvoice.create({
      userId: ownerId,
      number: "T2627/000001",
      paymentId,
      subscriptionId: "sub_invoiceFixture",
      issuedAt: now,
      retainUntil: new Date("2034-12-31"),
      periodStart: now,
      periodEnd: new Date("2026-11-01"),
      plan: "pro",
      testMode: true,
      base: 29900,
      gst: 5382,
      total: 35282,
      cgst: 2691,
      sgst: 2691,
      igst: 0,
      parties: encryptSecret(
        JSON.stringify({
          supplier: { name: "Test supplier" },
          recipient: { name: "Private recipient" },
        }),
        `billing-invoice:${paymentId}`,
      ),
    });
    expect(
      (await stranger.get(`/api/v1/billing/invoices/${invoice.id}`)).status,
    ).toBe(404);
    expect(
      (await owner.get(`/api/v1/billing/invoices/${invoice.id}`)).body.data
        .recipient.name,
    ).toBe("Private recipient");
    const list = (await owner.get("/api/v1/billing")).body.data.invoices;
    expect(JSON.stringify(list)).not.toContain("Private recipient");
    expect(JSON.stringify(list)).not.toContain("parties");
  });
  it("rejects webhook forgery before parsing and handles exact-byte concurrent replays", async () => {
    const secret = randomBytes(32).toString("hex");
    Object.assign(process.env, {
      RAZORPAY_KEY_ID: "rzp_test_integration",
      RAZORPAY_KEY_SECRET: randomBytes(32).toString("hex"),
      RAZORPAY_WEBHOOK_SECRET: secret,
      RAZORPAY_PRO_PLAN_ID: "plan_integrationPro",
      RAZORPAY_BUSINESS_PLAN_ID: "plan_integrationBusiness",
      BILLING_BUSINESS_NAME: "Test supplier",
      BILLING_BUSINESS_ADDRESS: "Supplier test address",
      BILLING_GSTIN: "27AAPFU0939F1ZV",
      BILLING_STATE_CODE: "27",
      BILLING_SAC: "998314",
    });
    // Unsupported events are acknowledged without making any provider request.
    const raw = '{ "event": "integration.unsupported", "payload": {} }';
    expect(
      (
        await request(app)
          .post("/api/v1/billing/webhook")
          .set("Content-Type", "text/plain")
          .send(raw)
      ).status,
    ).toBe(415);
    const id = randomUUID();
    const post = (body: string, signature: string) =>
      request(app)
        .post("/api/v1/billing/webhook")
        .set("Content-Type", "application/json")
        .set("X-Razorpay-Event-Id", id)
        .set("X-Razorpay-Signature", signature)
        .send(body);
    expect((await post("not-json", "a".repeat(64))).body.error.code).toBe(
      "INVALID_WEBHOOK_SIGNATURE",
    );
    const signature = createHmac("sha256", secret).update(raw).digest("hex");
    expect(
      (await post(JSON.stringify(JSON.parse(raw)), signature)).status,
    ).toBe(400);
    const replays = await Promise.all([
      post(raw, signature),
      post(raw, signature),
    ]);
    expect(replays.map((result) => result.status)).toEqual([200, 200]);
    expect(await BillingWebhook.countDocuments({ _id: id })).toBe(1);
    const altered = '{ "event": "integration.other", "payload": {} }';
    expect(
      (
        await post(
          altered,
          createHmac("sha256", secret).update(altered).digest("hex"),
        )
      ).body.error.code,
    ).toBe("WEBHOOK_CONFLICT");
    for (const name of [
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "RAZORPAY_WEBHOOK_SECRET",
      "RAZORPAY_PRO_PLAN_ID",
      "RAZORPAY_BUSINESS_PLAN_ID",
      "BILLING_BUSINESS_NAME",
      "BILLING_BUSINESS_ADDRESS",
      "BILLING_GSTIN",
      "BILLING_STATE_CODE",
      "BILLING_SAC",
    ])
      delete process.env[name];
  });
  it("exports finance separately and never exports passwords or session tokens", async () => {
    const exported = await owner.get("/api/v1/me");
    expect(exported.status).toBe(200);
    const text = JSON.stringify(exported.body);
    expect(text).not.toContain(password);
    expect(text).not.toContain("passwordHash");
    expect(text).not.toContain("$argon2id$");
    expect(text).not.toContain('"token"');
    expect(
      (await stranger.get(`/api/v1/workspaces/${workspaceId}/export`)).status,
    ).toBe(404);
    expect(
      (await owner.get(`/api/v1/workspaces/${workspaceId}/export`)).body.data
        .workspace.transactions,
    ).toHaveLength(2);
  });
  it("requires explicit deletion and removes tenant data and sessions transactionally", async () => {
    expect(
      (
        await owner
          .delete(`/api/v1/workspaces/${workspaceId}`)
          .send({ confirmation: "wrong" })
      ).status,
    ).toBe(422);
    expect(
      (
        await owner
          .delete(`/api/v1/workspaces/${workspaceId}`)
          .send({ confirmation: "DELETE Test ledger" })
      ).status,
    ).toBe(200);
    expect(await Transaction.countDocuments({ workspaceId })).toBe(0);
    expect(await WorkspaceUsage.countDocuments({ workspaceId })).toBe(0);
    expect(
      (
        await owner
          .delete("/api/v1/me")
          .send({ confirmation: "DELETE MY ACCOUNT" })
      ).status,
    ).toBe(200);
    expect((await owner.get("/api/v1/me")).status).toBe(401);
    expect(await BillingAccount.findById(ownerId)).toBeNull();
    expect(await BillingInvoice.countDocuments({ userId: ownerId })).toBe(0);
    expect(await BillingInvoice.countDocuments({ userId: /^deleted:/ })).toBe(
      1,
    );
    expect(
      await getDb().collection("sessions").countDocuments({ userId: ownerId }),
    ).toBe(0);
    expect(
      await getDb()
        .collection("users")
        .countDocuments({ _id: strangerId as never }),
    ).toBe(1);
  });
});
