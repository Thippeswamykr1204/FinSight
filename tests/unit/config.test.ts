import { describe, expect, it } from "vitest";
import {
  hostedConfig,
  validateEnvironment,
} from "../../apps/web/src/lib/hosted/config";
import { loadConfig } from "../../apps/api/src/config";
import { randomBytes } from "node:crypto";
const secrets = {
  BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
  FIELD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
};
describe("production environment", () => {
  it("validates web and API production without logging secrets", () => {
    expect(() => validateEnvironment({})).not.toThrow();
    expect(
      hostedConfig({ NEXT_PUBLIC_APP_URL: "https://finance.example.test" })
        .origin,
    ).toBe("https://finance.example.test");
    expect(() =>
      loadConfig({
        ...secrets,
        NODE_ENV: "production",
        WEB_ORIGIN: "http://finance.example.test",
        MONGODB_URI: "mongodb://db/finance",
        REDIS_URL: "redis://redis",
      } as NodeJS.ProcessEnv),
    ).toThrow("HTTPS");
    expect(loadConfig({ ...secrets, NODE_ENV: "development" }).SMTP_HOST).toBe(
      "localhost",
    );
  });
  it("rejects insecure public origins, local bypasses, incomplete SMTP and invalid ingress configuration", () => {
    expect(() =>
      loadConfig({
        ...secrets,
        NODE_ENV: "development",
        HOSTED_LOCAL: "true",
        WEB_ORIGIN: "https://finance.example.test",
      }),
    ).toThrow("loopback");
    expect(() =>
      loadConfig({ ...secrets, NODE_ENV: "development", SMTP_USER: "user" }),
    ).toThrow("SMTP_PASSWORD");
    expect(() => validateEnvironment({ NODE_ENV: "production" })).toThrow(
      "API_URL",
    );
  });
});
