import { describe, expect, it } from "vitest";
import { hostedConfig, validateEnvironment } from "../../src/lib/hosted/config";

const valid = {
  HOSTED_ENABLED: "true",
  NODE_ENV: "production",
  HOSTED_DATABASE_URL: "postgresql://user:secret@db.example.test/finance",
  BETTER_AUTH_URL: "https://finance.example.test",
  BETTER_AUTH_SECRET: "a".repeat(48),
  SMTP_HOST: "smtp.example.test",
  EMAIL_FROM: "FinSight <mail@example.test>",
  PRIVACY_CONTACT_EMAIL: "privacy@example.test",
  GRIEVANCE_OFFICER_NAME: "Test operator",
};
describe("production environment", () => {
  it("allows the no-configuration demo and validates hosted production without logging secrets", () => {
    expect(() => validateEnvironment({})).not.toThrow();
    expect(hostedConfig(valid).origin).toBe("https://finance.example.test");
    expect(() => hostedConfig({ HOSTED_ENABLED: "true" })).toThrow(
      /HOSTED_DATABASE_URL.*BETTER_AUTH_URL.*BETTER_AUTH_SECRET.*SMTP_HOST/,
    );
    expect(() =>
      hostedConfig({ ...valid, BETTER_AUTH_SECRET: "short-secret" }),
    ).toThrow("BETTER_AUTH_SECRET");
  });
  it("rejects insecure public origins, local bypasses, incomplete SMTP and invalid ingress configuration", () => {
    expect(() =>
      hostedConfig({
        ...valid,
        BETTER_AUTH_URL: "http://finance.example.test",
      }),
    ).toThrow("HTTPS");
    expect(() => hostedConfig({ ...valid, HOSTED_LOCAL: "true" })).toThrow(
      "loopback",
    );
    expect(() => hostedConfig({ ...valid, SMTP_USER: "user" })).toThrow(
      "SMTP_PASSWORD",
    );
    expect(() =>
      hostedConfig({ ...valid, TRUSTED_IP_HEADER: "X-Bad Header" }),
    ).toThrow("TRUSTED_IP_HEADER");
    expect(() => hostedConfig({ ...valid, PRIVACY_CONTACT_EMAIL: "" })).toThrow(
      "PRIVACY_CONTACT_EMAIL",
    );
    expect(() => hostedConfig({ ...valid, ENABLE_LEGACY_API: "true" })).toThrow(
      "ENABLE_LEGACY_API",
    );
    expect(() =>
      hostedConfig({
        ...valid,
        HOSTED_DATABASE_URL: "https://db.example.test",
      }),
    ).toThrow("PostgreSQL");
    expect(() => validateEnvironment({ HOSTED_ENABLED: "treu" })).toThrow(
      "HOSTED_ENABLED",
    );
  });
});
