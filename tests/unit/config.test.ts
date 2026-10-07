import { describe, expect, it } from "vitest";
import { hostedConfig, validateEnvironment } from "../../src/lib/hosted/config";
import { loadConfig } from "../../apps/api/src/config";
describe("production environment", () => {
  it("allows the no-configuration demo and validates hosted production without logging secrets", () => {
    expect(() => validateEnvironment({})).not.toThrow();
    expect(
      hostedConfig({ NEXT_PUBLIC_APP_URL: "https://finance.example.test" })
        .origin,
    ).toBe("https://finance.example.test");
    expect(() =>
      loadConfig({
        NODE_ENV: "production",
        WEB_ORIGIN: "http://finance.example.test",
        MONGODB_URI: "mongodb://db/finance",
        REDIS_URL: "redis://redis",
        BETTER_AUTH_SECRET: "a".repeat(48),
      } as NodeJS.ProcessEnv),
    ).toThrow("HTTPS");
    expect(loadConfig({ NODE_ENV: "development" }).SMTP_HOST).toBe("localhost");
  });
  it("rejects insecure public origins, local bypasses, incomplete SMTP and invalid ingress configuration", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        HOSTED_LOCAL: "true",
        WEB_ORIGIN: "https://finance.example.test",
      }),
    ).toThrow("loopback");
    expect(() =>
      loadConfig({ NODE_ENV: "development", SMTP_USER: "user" }),
    ).toThrow("SMTP_PASSWORD");
    expect(() => validateEnvironment({ HOSTED_ENABLED: "treu" })).toThrow(
      "HOSTED_ENABLED",
    );
  });
});
