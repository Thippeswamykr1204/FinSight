import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../src/generated/hosted";
import {
  command,
  headers,
  latestMail,
  origin,
  register,
  workspace,
} from "./helpers";

test("verified identities enforce workspace isolation, roles, idempotency and cursor scope", async ({
  playwright,
}) => {
  test.setTimeout(120000);
  const owner = await playwright.request.newContext();
  const outsider = await playwright.request.newContext();
  const anon = await playwright.request.newContext();
  await register(owner);
  const invitedEmail = await register(outsider);
  const a = await workspace(owner);
  const b = await workspace(outsider, "Other household");
  expect((await anon.get(`${origin}/api/v1/workspaces`)).status()).toBe(401);
  expect(
    (await outsider.get(`${origin}/api/v1/workspaces/${a}/overview`)).status(),
  ).toBe(404);
  const account = await command(owner, a, {
    action: "account.create",
    data: { name: "Checking", type: "Cash", openingBalance: 100000 },
  });
  expect(account.status(), await account.text()).toBe(200);
  const accountId = (await account.json()).data.id;
  const idempotency = randomUUID();
  const payload = {
    action: "transaction.create",
    data: {
      accountId,
      merchant: "Isolation Cafe",
      amount: 1250,
      date: "2026-10-04",
      type: "expense",
      category: "Food & dining",
      note: "",
    },
  };
  const [first, replay] = await Promise.all([
    command(owner, a, payload, idempotency),
    command(owner, a, payload, idempotency),
  ]);
  expect(first.status(), await first.text()).toBe(200);
  expect(replay.status()).toBe(200);
  const record = (await first.json()).data;
  expect((await replay.json()).data.id).toBe(record.id);
  expect(
    (
      await command(
        owner,
        a,
        { ...payload, data: { ...payload.data, amount: 2500 } },
        idempotency,
      )
    ).status(),
  ).toBe(409);
  expect((await command(outsider, b, payload)).status()).toBe(404);
  expect(
    (
      await owner.post(`${origin}/api/v1/workspaces/${a}/commands`, {
        headers: {
          origin: "https://attacker.invalid",
          "Idempotency-Key": randomUUID(),
        },
        data: payload,
      })
    ).status(),
  ).toBe(403);
  const second = await command(owner, a, {
    ...payload,
    data: { ...payload.data, merchant: "Second Cafe" },
  });
  expect(second.status()).toBe(200);
  const paged = await owner.get(
    `${origin}/api/v1/workspaces/${a}/transactions?limit=1`,
  );
  const page = (await paged.json()).data;
  expect(page.items).toHaveLength(1);
  expect(page.nextCursor).toBeTruthy();
  const next = await owner.get(
    `${origin}/api/v1/workspaces/${a}/transactions?limit=1&cursor=${encodeURIComponent(page.nextCursor)}`,
  );
  expect((await next.json()).data.items[0].id).not.toBe(page.items[0].id);
  expect(
    (
      await outsider.get(
        `${origin}/api/v1/workspaces/${b}/transactions?cursor=${encodeURIComponent(page.nextCursor)}`,
      )
    ).status(),
  ).toBe(400);
  const update = await command(owner, a, {
    action: "transaction.update",
    id: record.id,
    version: 1,
    data: { ...payload.data, amount: 1500 },
  });
  expect(update.status()).toBe(200);
  expect(
    (
      await command(owner, a, {
        action: "transaction.delete",
        id: record.id,
        version: 1,
      })
    ).status(),
  ).toBe(409);
  const overview = (
    await (await owner.get(`${origin}/api/v1/workspaces/${a}/overview`)).json()
  ).data;
  expect(overview.balance).toBe(97250);
  const invite = await owner.post(`${origin}/api/v1/workspaces/${a}/members`, {
    headers,
    data: { email: invitedEmail, role: "VIEWER" },
  });
  expect(invite.status(), await invite.text()).toBe(201);
  const mail = await latestMail(outsider, invitedEmail, "invited");
  const token = new URL(
    mail.Text.match(/http:\/\/localhost:3200\/app\/invitations[^\s]+/)![0],
  ).searchParams.get("token");
  const accept = await outsider.post(`${origin}/api/v1/invitations/accept`, {
    headers,
    data: { token },
  });
  expect(accept.status(), await accept.text()).toBe(200);
  expect(
    (
      await outsider.post(`${origin}/api/v1/invitations/accept`, {
        headers,
        data: { token },
      })
    ).status(),
  ).toBe(404);
  expect(
    (await outsider.get(`${origin}/api/v1/workspaces/${a}/overview`)).status(),
  ).toBe(200);
  expect((await command(outsider, a, payload)).status()).toBe(403);
  expect(
    (await outsider.get(`${origin}/api/v1/workspaces/${a}/export`)).status(),
  ).toBe(403);
  const membership = (
    await (await owner.get(`${origin}/api/v1/workspaces/${a}/overview`)).json()
  ).data.members.find((member: { role: string }) => member.role === "VIEWER");
  expect(
    (
      await owner.patch(`${origin}/api/v1/workspaces/${a}/members`, {
        headers,
        data: { userId: membership.userId, role: "EDITOR" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await command(outsider, a, {
        ...payload,
        data: { ...payload.data, merchant: "Editor purchase" },
      })
    ).status(),
  ).toBe(200);
  const audit = (
    await (await owner.get(`${origin}/api/v1/workspaces/${a}/audit`)).json()
  ).data;
  expect(
    audit.filter(
      (event: { action: string; resourceId: string }) =>
        event.action === "transaction.create" && event.resourceId === record.id,
    ),
  ).toHaveLength(1);
  await owner.dispose();
  await outsider.dispose();
  await anon.dispose();
});

test("database composite foreign keys reject cross-workspace account references", async ({
  playwright,
}) => {
  const client = await playwright.request.newContext();
  await register(client);
  const a = await workspace(client, "Constraint workspace A");
  const b = await workspace(client, "Constraint workspace B");
  const account = (
    await (
      await command(client, a, {
        action: "account.create",
        data: { name: "Primary", type: "Cash", openingBalance: 0 },
      })
    ).json()
  ).data;
  const db = new PrismaClient({
    datasources: { db: { url: process.env.HOSTED_DATABASE_URL } },
  });
  await expect(
    db.ledgerEntry.create({
      data: {
        workspaceId: b,
        accountId: account.id,
        merchant: "Illegal link",
        amount: 100,
        date: new Date(),
        type: "expense",
        category: "Other",
      },
    }),
  ).rejects.toThrow();
  await expect(
    db.ledgerEntry.create({
      data: {
        workspaceId: a,
        accountId: account.id,
        merchant: "Invalid amount",
        amount: -1,
        date: new Date(),
        type: "expense",
        category: "Other",
      },
    }),
  ).rejects.toThrow();
  await db.$disconnect();
  await client.dispose();
});
