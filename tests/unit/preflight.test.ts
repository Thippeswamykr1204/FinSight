import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  evaluateEnvironment,
  formatReport,
  summarize,
  type Environment,
} from "../../scripts/preflight.mts";

const productionEnvironment = (): Environment => ({
  NODE_ENV: "production",
  HOSTED_LOCAL: "false",
  WEB_ORIGIN: "https://app.ledger-host.net",
  NEXT_PUBLIC_APP_URL: "https://app.ledger-host.net",
  API_ORIGIN: "https://api.ledger-host.net",
  API_URL: "https://api.ledger-host.net",
  BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
  FIELD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  FIELD_ENCRYPTION_PREVIOUS_KEYS: "[]",
  MONGODB_URI:
    "mongodb+srv://service:secret-value@cluster0.abcd1.mongodb.net/finsight?retryWrites=true",
  REDIS_URL: "rediss://default:secret-value@cache.ledger-host.net:6380",
  SMTP_HOST: "smtp.mail-provider.net",
  SMTP_PORT: "587",
  SMTP_USER: "apikey",
  SMTP_PASSWORD: randomBytes(16).toString("hex"),
  EMAIL_FROM: "FinSight <no-reply@ledger-host.net>",
  PRIVACY_CONTACT_EMAIL: "privacy@ledger-host.net",
  GRIEVANCE_OFFICER_NAME: "Priya Sharma",
  TRUSTED_PROXY: "10.0.0.0/8",
  SENTRY_DSN: "https://public@o0.ingest.sentry.io/1",
});

const failed = (env: Environment) =>
  evaluateEnvironment(env)
    .filter((finding) => finding.level === "fail")
    .map((finding) => finding.check);

describe("production preflight", () => {
  it("accepts a complete Free-only production environment", () => {
    const findings = evaluateEnvironment(productionEnvironment());
    expect(summarize(findings).failures).toBe(0);
    expect(summarize(findings).warnings).toBe(0);
  });

  it("rejects the local development defaults", () => {
    const env = {
      ...productionEnvironment(),
      NODE_ENV: "development",
      HOSTED_LOCAL: "true",
      WEB_ORIGIN: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      API_ORIGIN: "http://localhost:4000",
    };
    const checks = failed(env);
    expect(checks).toEqual(
      expect.arrayContaining([
        "NODE_ENV",
        "HOSTED_LOCAL",
        "WEB_ORIGIN",
        "API_ORIGIN",
        "NEXT_PUBLIC_APP_URL",
      ]),
    );
  });

  it("accepts a private API behind the public web service", () => {
    const findings = evaluateEnvironment({
      ...productionEnvironment(),
      API_ORIGIN: "http://finsight-api:4000",
      API_URL: "http://finsight-api:4000",
      REDIS_URL: "redis://red-abc123:6379",
    });
    expect(summarize(findings).failures).toBe(0);
  });

  it("still rejects a public API served over plain HTTP", () => {
    expect(
      failed({
        ...productionEnvironment(),
        API_ORIGIN: "http://api.ledger-host.net",
      }),
    ).toContain("API_ORIGIN");
  });

  it("requires matching web origins", () => {
    expect(
      failed({
        ...productionEnvironment(),
        NEXT_PUBLIC_APP_URL: "https://other.ledger-host.net",
      }),
    ).toContain("WEB_ORIGIN");
  });

  it("rejects weak or placeholder secrets", () => {
    expect(
      failed({ ...productionEnvironment(), BETTER_AUTH_SECRET: "short" }),
    ).toContain("BETTER_AUTH_SECRET");
    expect(
      failed({
        ...productionEnvironment(),
        BETTER_AUTH_SECRET: "change-me-".repeat(6),
      }),
    ).toContain("BETTER_AUTH_SECRET");
    expect(
      failed({ ...productionEnvironment(), FIELD_ENCRYPTION_KEY: "ab12" }),
    ).toContain("FIELD_ENCRYPTION_KEY");
    expect(
      failed({
        ...productionEnvironment(),
        FIELD_ENCRYPTION_KEY: "0".repeat(64),
      }),
    ).toContain("FIELD_ENCRYPTION_KEY");
  });

  it("rejects retained keys that repeat the current key", () => {
    const env = productionEnvironment();
    env.FIELD_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify([
      env.FIELD_ENCRYPTION_KEY,
    ]);
    expect(failed(env)).toContain("FIELD_ENCRYPTION_PREVIOUS_KEYS");
  });

  it("requires an authenticated MongoDB replica set with a database name", () => {
    const base = productionEnvironment();
    expect(
      failed({ ...base, MONGODB_URI: "mongodb://localhost:27017/finsight" }),
    ).toContain("MONGODB_URI");
    expect(
      failed({
        ...base,
        MONGODB_URI: "mongodb://user:pw@db.ledger-host.net:27017/finsight",
      }),
    ).toContain("MONGODB_URI");
    expect(
      failed({
        ...base,
        MONGODB_URI: "mongodb+srv://cluster0.abcd1.mongodb.net/finsight",
      }),
    ).toContain("MONGODB_URI");
    expect(
      failed({
        ...base,
        MONGODB_URI: "mongodb+srv://user:pw@cluster0.abcd1.mongodb.net/",
      }),
    ).toContain("MONGODB_URI");
    expect(
      failed({
        ...base,
        MONGODB_URI:
          "mongodb://user:pw@db.ledger-host.net:27017/finsight?replicaSet=rs0&tls=true",
      }),
    ).not.toContain("MONGODB_URI");
  });

  it("requires TLS and a password for public Redis", () => {
    const base = productionEnvironment();
    expect(
      failed({ ...base, REDIS_URL: "redis://cache.ledger-host.net:6379" }),
    ).toContain("REDIS_URL");
    expect(
      failed({ ...base, REDIS_URL: "rediss://cache.ledger-host.net:6380" }),
    ).toContain("REDIS_URL");
    expect(failed({ ...base, REDIS_URL: "redis://localhost:6379" })).toContain(
      "REDIS_URL",
    );
  });

  it("only warns about plain Redis on a private network", () => {
    const findings = evaluateEnvironment({
      ...productionEnvironment(),
      REDIS_URL: "redis://:secret-value@redis:6379",
    });
    expect(
      findings.find((finding) => finding.check === "REDIS_URL")?.level,
    ).toBe("warn");
  });

  it("rejects local mail and placeholder sender or operator details", () => {
    const base = productionEnvironment();
    expect(failed({ ...base, SMTP_HOST: "mailpit" })).toContain("SMTP_HOST");
    expect(
      failed({ ...base, EMAIL_FROM: "FinSight Local <hello@finsight.local>" }),
    ).toContain("EMAIL_FROM");
    expect(
      failed({ ...base, PRIVACY_CONTACT_EMAIL: "privacy@example.com" }),
    ).toContain("PRIVACY_CONTACT_EMAIL");
    expect(
      failed({ ...base, GRIEVANCE_OFFICER_NAME: "Local operator" }),
    ).toContain("GRIEVANCE_OFFICER_NAME");
    expect(failed({ ...base, SMTP_PASSWORD: "" })).toContain("SMTP_PASSWORD");
  });

  it("treats billing as all or nothing", () => {
    const partial = failed({
      ...productionEnvironment(),
      RAZORPAY_KEY_ID: "rzp_test_abc123",
    });
    expect(partial).toContain("Billing");
  });

  it("warns when a complete billing group is active", () => {
    const findings = evaluateEnvironment({
      ...productionEnvironment(),
      RAZORPAY_KEY_ID: "rzp_live_abc123",
      RAZORPAY_KEY_SECRET: randomBytes(16).toString("hex"),
      RAZORPAY_WEBHOOK_SECRET: randomBytes(24).toString("hex"),
      RAZORPAY_PRO_PLAN_ID: "plan_pro123",
      RAZORPAY_BUSINESS_PLAN_ID: "plan_biz123",
      BILLING_BUSINESS_NAME: "Ledger Host Pvt Ltd",
      BILLING_BUSINESS_ADDRESS: "1 Example Street, Bengaluru",
      BILLING_GSTIN: "29ABCDE1234F1Z5",
      BILLING_STATE_CODE: "29",
      BILLING_SAC: "998314",
    });
    expect(summarize(findings).failures).toBe(0);
    expect(
      findings.find((finding) => finding.check === "RAZORPAY_KEY_ID")?.level,
    ).toBe("warn");
  });

  it("requires both Google credentials or neither", () => {
    expect(
      failed({ ...productionEnvironment(), GOOGLE_CLIENT_ID: "client" }),
    ).toContain("Google OAuth");
  });

  it("rejects wildcard proxy trust", () => {
    expect(
      failed({ ...productionEnvironment(), TRUSTED_PROXY: "0.0.0.0/0" }),
    ).toContain("TRUSTED_PROXY");
    expect(
      failed({ ...productionEnvironment(), TRUSTED_PROXY: "true" }),
    ).toContain("TRUSTED_PROXY");
  });

  it("never prints secret values in the report", () => {
    const env = productionEnvironment();
    const report = formatReport(
      evaluateEnvironment({ ...env, BETTER_AUTH_SECRET: "short" }),
    );
    for (const value of [
      env.FIELD_ENCRYPTION_KEY,
      env.SMTP_PASSWORD,
      "secret-value",
      "short",
    ])
      expect(report).not.toContain(value);
  });
});