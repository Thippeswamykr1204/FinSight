import { test, expect } from "@playwright/test";
import { PrismaClient } from "../../src/generated/hosted";
import {
  register,
  workspace,
  command,
  headers,
  origin,
  email,
  password,
  clientIP,
} from "./helpers";

test("personal exports exclude secrets and deletion protects owners, tenants and stale sessions", async ({
  playwright,
}) => {
  const client = await playwright.request.newContext();
  const outsider = await playwright.request.newContext();
  const db = new PrismaClient();
  try {
    const unconsented = await client.post(
      `${origin}/api/identity/sign-up/email`,
      {
        headers: { ...headers, "x-test-forwarded-ip": clientIP() },
        data: { name: "No consent", email: email(), password },
      },
    );
    expect(unconsented.status()).toBe(400);
    const address = await register(client);
    await register(outsider);
    const id = await workspace(client, "Rights household");
    const account = (
      await (
        await command(client, id, {
          action: "account.create",
          data: { name: "SBI", type: "Savings", openingBalance: 10000 },
        })
      ).json()
    ).data;
    await command(client, id, {
      action: "transaction.create",
      data: {
        merchant: "BESCOM",
        amount: 100,
        date: "2026-10-05",
        type: "expense",
        category: "Utilities",
        accountId: account.id,
        note: "",
      },
    });
    const exported = await (await client.get(`${origin}/api/v1/me`)).json();
    expect(exported.data.profile.email).toBe(address);
    expect(exported.data.profile.noticeVersion).toBe("2026-10-05");
    expect(exported.data.profile.noticeAcceptedAt).toBeTruthy();
    expect(exported.data.profile.noticeAccepted).toBe(true);
    expect(JSON.stringify(exported)).not.toMatch(
      /"(?:password|token|secret|publicKey)":/,
    );
    const deletion = { headers, data: { confirmation: "DELETE MY ACCOUNT" } };
    expect(
      (await client.delete(`${origin}/api/v1/me`, deletion)).status(),
    ).toBe(409);
    expect(
      (
        await outsider.delete(`${origin}/api/v1/workspaces/${id}`, {
          headers,
          data: { confirmation: "DELETE Rights household" },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await client.delete(`${origin}/api/v1/workspaces/${id}`, {
          headers,
          data: { confirmation: "wrong" },
        })
      ).status(),
    ).toBe(422);
    expect(
      (
        await client.delete(`${origin}/api/v1/workspaces/${id}`, {
          headers,
          data: { confirmation: "DELETE Rights household" },
        })
      ).status(),
    ).toBe(200);
    expect(await db.ledgerEntry.count({ where: { workspaceId: id } })).toBe(0);
    expect(
      await db.financialAccount.count({ where: { workspaceId: id } }),
    ).toBe(0);
    const user = await db.user.findUniqueOrThrow({ where: { email: address } });
    const sessions = await db.session.findMany({ where: { userId: user.id } });
    await db.session.updateMany({
      where: { userId: user.id },
      data: { createdAt: new Date(Date.now() - 11 * 60 * 1000) },
    });
    expect(
      (await client.delete(`${origin}/api/v1/me`, deletion)).status(),
    ).toBe(403);
    await db.session.updateMany({
      where: { userId: user.id },
      data: { createdAt: new Date() },
    });
    expect(
      (await client.delete(`${origin}/api/v1/me`, deletion)).status(),
    ).toBe(200);
    expect(await db.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(
      await db.session.count({
        where: { id: { in: sessions.map((session) => session.id) } },
      }),
    ).toBe(0);
    expect(await db.account.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.emailOutbox.count({ where: { to: address } })).toBe(0);
    expect((await client.get(`${origin}/api/v1/me`)).status()).toBe(401);
  } finally {
    await db.$disconnect();
    await client.dispose();
    await outsider.dispose();
  }
});
