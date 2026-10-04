import { createHmac } from "node:crypto";
import { test, expect } from "@playwright/test";
import {
  clientIP,
  headers,
  latestMail,
  origin,
  password,
  register,
} from "./helpers";

function totp(uri: string) {
  const secret = new URL(uri).searchParams.get("secret")!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase().replace(/=+$/, "")]
    .map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0"))
    .join("");
  const key = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", key).update(counter).digest();
  return String(
    (hash.readUInt32BE(hash[hash.length - 1] & 15) & 0x7fffffff) % 1_000_000,
  ).padStart(6, "0");
}

test("password reset revokes sessions and magic links are single use", async ({
  playwright,
}) => {
  const client = await playwright.request.newContext({
    extraHTTPHeaders: { "x-test-forwarded-ip": clientIP() },
  });
  const address = await register(client);
  const oldSession = await playwright.request.newContext({
    storageState: await client.storageState(),
  });
  const reset = await client.post(
    `${origin}/api/identity/request-password-reset`,
    { headers, data: { email: address, redirectTo: "/auth/new-password" } },
  );
  expect(reset.status(), await reset.text()).toBe(200);
  const mail = await latestMail(client, address, "Reset");
  const resetLink = mail.Text.match(
    /http:\/\/localhost:3200\/api\/identity\/reset-password[^\s]+/,
  )![0];
  const redirect = await client.get(resetLink, { maxRedirects: 0 });
  const token = new URL(redirect.headers().location, origin).searchParams.get(
    "token",
  );
  expect(token).toBeTruthy();
  const changed = await client.post(`${origin}/api/identity/reset-password`, {
    headers,
    data: { token, newPassword: `${password}new` },
  });
  expect(changed.status(), await changed.text()).toBe(200);
  expect((await oldSession.get(`${origin}/api/v1/workspaces`)).status()).toBe(
    401,
  );
  expect(
    (
      await client.post(`${origin}/api/identity/reset-password`, {
        headers,
        data: { token, newPassword: `${password}again` },
      })
    ).status(),
  ).toBeGreaterThanOrEqual(400);
  const magic = await client.post(`${origin}/api/identity/sign-in/magic-link`, {
    headers,
    data: { email: address, callbackURL: "/app" },
  });
  expect(magic.status()).toBe(200);
  const magicMail = await latestMail(client, address, "sign-in link");
  const link = magicMail.Text.match(
    /http:\/\/localhost:3200\/api\/identity\/magic-link\/verify[^\s]+/,
  )![0];
  const result = await client.get(link, { maxRedirects: 0 });
  expect(result.status()).toBe(302);
  expect((await client.get(`${origin}/api/v1/workspaces`)).status()).toBe(200);
  const used = await client.get(link, { maxRedirects: 0 });
  expect(used.headers().location).toContain("error=");
  await client.dispose();
  await oldSession.dispose();
});

test("authenticator enrollment is verified, recovery codes are single use, and magic links cannot bypass MFA", async ({
  playwright,
}) => {
  test.setTimeout(90000);
  const client = await playwright.request.newContext({
    extraHTTPHeaders: { "x-test-forwarded-ip": clientIP() },
  });
  const address = await register(client);
  const enrollment = await client.post(
    `${origin}/api/identity/two-factor/enable`,
    { headers, data: { password, method: "totp" } },
  );
  expect(enrollment.status(), await enrollment.text()).toBe(200);
  const setup = await enrollment.json();
  expect(setup.totpURI).toContain("otpauth://");
  const before = await client.get(`${origin}/api/identity/get-session`);
  expect((await before.json()).user.twoFactorEnabled).toBe(false);
  const verified = await client.post(
    `${origin}/api/identity/two-factor/verify-totp`,
    { headers, data: { code: totp(setup.totpURI) } },
  );
  expect(verified.status(), await verified.text()).toBe(200);
  await client.post(`${origin}/api/identity/sign-out`, { headers, data: {} });
  const login = await client.post(`${origin}/api/identity/sign-in/email`, {
    headers,
    data: { email: address, password },
  });
  expect((await login.json()).twoFactorRedirect).toBe(true);
  expect((await client.get(`${origin}/api/v1/workspaces`)).status()).toBe(401);
  const recovery = await client.post(
    `${origin}/api/identity/two-factor/verify-backup-code`,
    { headers, data: { code: setup.backupCodes[0] } },
  );
  expect(recovery.status(), await recovery.text()).toBe(200);
  expect((await client.get(`${origin}/api/v1/workspaces`)).status()).toBe(200);
  await client.post(`${origin}/api/identity/sign-out`, { headers, data: {} });
  await client.post(`${origin}/api/identity/sign-in/magic-link`, {
    headers,
    data: { email: address, callbackURL: "/app", errorCallbackURL: "/sign-in" },
  });
  const mail = await latestMail(client, address, "sign-in link");
  const link = mail.Text.match(
    /http:\/\/localhost:3200\/api\/identity\/magic-link\/verify[^\s]+/,
  )![0];
  await client.get(link, { maxRedirects: 0 });
  expect((await client.get(`${origin}/api/v1/workspaces`)).status()).toBe(401);
  await client.post(`${origin}/api/identity/sign-in/email`, {
    headers,
    data: { email: address, password },
  });
  const reused = await client.post(
    `${origin}/api/identity/two-factor/verify-backup-code`,
    { headers, data: { code: setup.backupCodes[0] } },
  );
  expect(reused.status()).toBeGreaterThanOrEqual(400);
  await client.dispose();
});

test("identity bounds payloads, rejects foreign origins, and throttles repeated password attempts", async ({
  playwright,
}) => {
  const client = await playwright.request.newContext({
    extraHTTPHeaders: { "x-test-forwarded-ip": clientIP() },
  });
  const oversized = await client.post(`${origin}/api/identity/sign-in/email`, {
    headers,
    data: { email: "absent@example.test", password: "a".repeat(65_000) },
  });
  expect(oversized.status()).toBe(413);
  const health = await client.get(`${origin}/api/health`);
  expect(health.status()).toBe(200);
  expect((await health.json()).mode).toBe("hosted");
  const blocked = await client.post(`${origin}/api/identity/sign-in/email`, {
    headers: { origin: "https://malicious.invalid" },
    data: { email: "absent@example.test", password },
  });
  expect(blocked.status()).toBe(403);
  let limited = false;
  for (let index = 0; index < 12; index++) {
    const response = await client.post(`${origin}/api/identity/sign-in/email`, {
      headers,
      data: { email: "absent@example.test", password },
    });
    if (response.status() === 429) {
      limited = true;
      break;
    }
    expect(response.status()).toBe(401);
  }
  expect(limited).toBe(true);
  await client.dispose();
});
