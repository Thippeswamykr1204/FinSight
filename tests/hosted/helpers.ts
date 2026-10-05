import { randomInt, randomUUID } from "node:crypto";
import { expect, type APIRequestContext } from "@playwright/test";

export const origin = "http://localhost:3200";
export const password = "A-long-test-passphrase-2026!";
export const email = () => `test-${randomUUID()}@example.test`;
export const headers = { origin };
export const clientIP = () =>
  `198.18.${randomInt(1, 250)}.${randomInt(1, 250)}`;

export async function latestMail(
  client: APIRequestContext,
  address: string,
  subject: string,
) {
  let id = "";
  await expect
    .poll(
      async () => {
        const response = await client.get(
          `http://127.0.0.1:18025/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
        );
        const data = await response.json();
        const message = data.messages?.find(
          (mail: { Subject: string; ID: string }) =>
            mail.Subject.includes(subject),
        );
        id = message?.ID ?? "";
        return Boolean(id);
      },
      { timeout: 20000 },
    )
    .toBe(true);
  const result = await client.get(
    `http://127.0.0.1:18025/api/v1/message/${id}`,
  );
  return (await result.json()) as { Text: string };
}
export async function register(client: APIRequestContext, address = email()) {
  const identityHeaders = { ...headers, "x-test-forwarded-ip": clientIP() };
  const signup = await client.post(`${origin}/api/identity/sign-up/email`, {
    headers: identityHeaders,
    data: {
      email: address,
      password,
      noticeAccepted: true,
      name: "Hosted Test",
      callbackURL: "/sign-in",
    },
  });
  expect(signup.status(), await signup.text()).toBe(200);
  const mail = await latestMail(client, address, "Verify");
  const url = mail.Text.match(
    /http:\/\/localhost:3200\/api\/identity\/verify-email[^\s]+/,
  )?.[0];
  expect(url).toBeTruthy();
  const verify = await client.get(url!);
  expect(verify.status()).toBe(200);
  const login = await client.post(`${origin}/api/identity/sign-in/email`, {
    headers: identityHeaders,
    data: { email: address, password },
  });
  expect(login.status(), await login.text()).toBe(200);
  return address;
}
export async function workspace(
  client: APIRequestContext,
  name = "Integration household",
) {
  const response = await client.post(`${origin}/api/v1/workspaces`, {
    headers,
    data: { name },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).data.id as string;
}
export async function command(
  client: APIRequestContext,
  workspaceId: string,
  data: unknown,
  key = randomUUID(),
) {
  return client.post(`${origin}/api/v1/workspaces/${workspaceId}/commands`, {
    headers: { ...headers, "Idempotency-Key": key },
    data,
  });
}
