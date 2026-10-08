import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

const production = () => ({
  NODE_ENV: "production",
  WEB_ORIGIN: "https://finance.example.test",
  API_ORIGIN: "https://api.example.test",
  MONGODB_URI: "mongodb://db/finance",
  REDIS_URL: "redis://redis",
  BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
  FIELD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  PRIVACY_CONTACT_EMAIL: "privacy@example.test",
  GRIEVANCE_OFFICER_NAME: "Finance operator",
});

describe("secret validation", () => {
  it("accepts explicitly generated production secrets", () => {
    expect(loadConfig(production()).NODE_ENV).toBe("production");
  });
  it.each(["BETTER_AUTH_SECRET", "FIELD_ENCRYPTION_KEY"])(
    "requires %s in every environment",
    (name) => {
      const env: NodeJS.ProcessEnv = production();
      delete env[name];
      expect(() => loadConfig(env)).toThrow(name);
      env.NODE_ENV = "development";
      expect(() => loadConfig(env)).toThrow(name);
    },
  );
  it.each([
    "",
    "local-development-secret-change-me-please",
    "change-me-please-with-32-characters",
    "0".repeat(64),
  ])("rejects an insecure authentication secret", (secret) => {
    expect(() =>
      loadConfig({ ...production(), BETTER_AUTH_SECRET: secret }),
    ).toThrow("BETTER_AUTH_SECRET");
  });
  it.each(["", "0".repeat(64), "a".repeat(63), "g".repeat(64), "a".repeat(65)])(
    "rejects an invalid encryption key",
    (key) => {
      expect(() =>
        loadConfig({ ...production(), FIELD_ENCRYPTION_KEY: key }),
      ).toThrow("FIELD_ENCRYPTION_KEY");
    },
  );
  it.each(["not-json", "{}", '["bad"]', JSON.stringify(["0".repeat(64)])])(
    "rejects invalid retained keys",
    (keys) => {
      expect(() =>
        loadConfig({ ...production(), FIELD_ENCRYPTION_PREVIOUS_KEYS: keys }),
      ).toThrow("FIELD_ENCRYPTION_PREVIOUS_KEYS");
    },
  );
  it("does not disclose rejected secret values", () => {
    const secret = "invalid-confidential-value";
    try {
      loadConfig({ ...production(), BETTER_AUTH_SECRET: secret });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});

describe("optional provider configuration", () => {
  it("allows an entirely absent billing group for Free-only operation", () => {
    expect(loadConfig(production()).RAZORPAY_KEY_ID).toBeUndefined();
  });
  it("rejects partial billing and Google credentials", () => {
    expect(() =>
      loadConfig({ ...production(), RAZORPAY_KEY_ID: "rzp_test_validation" }),
    ).toThrow("Billing requires all");
    expect(() =>
      loadConfig({ ...production(), GOOGLE_CLIENT_ID: "client-id" }),
    ).toThrow("both GOOGLE_CLIENT_ID");
  });
  it("validates supplier identity, matching state and distinct plans", () => {
    const env = {
      ...production(),
      RAZORPAY_KEY_ID: "rzp_test_validation",
      RAZORPAY_KEY_SECRET: randomBytes(32).toString("hex"),
      RAZORPAY_WEBHOOK_SECRET: randomBytes(32).toString("hex"),
      RAZORPAY_PRO_PLAN_ID: "plan_proValidation",
      RAZORPAY_BUSINESS_PLAN_ID: "plan_businessValidation",
      BILLING_BUSINESS_NAME: "Integration test supplier",
      BILLING_BUSINESS_ADDRESS: "Integration test supplier address",
      BILLING_GSTIN: "27AAPFU0939F1ZV",
      BILLING_STATE_CODE: "27",
      BILLING_SAC: "998314",
    };
    expect(loadConfig(env).BILLING_STATE_CODE).toBe("27");
    expect(() => loadConfig({ ...env, BILLING_STATE_CODE: "29" })).toThrow(
      "must match",
    );
    expect(() =>
      loadConfig({
        ...env,
        RAZORPAY_BUSINESS_PLAN_ID: env.RAZORPAY_PRO_PLAN_ID,
      }),
    ).toThrow("distinct");
  });
});
