import { z } from "zod";
import { gstinSchema, stateCodeSchema } from "@finsight/shared";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

const encryptionKey = z
  .string()
  .regex(/^[a-fA-F0-9]{64}$/, "must be 64 hexadecimal characters")
  .refine((key) => !/^0{64}$/.test(key), "must not be all zeros");
const previousKeys = z
  .string()
  .optional()
  .transform((value, context): string[] => {
    if (!value) return [];
    try {
      return z.array(encryptionKey).max(10).parse(JSON.parse(value));
    } catch {
      context.addIssue({
        code: "custom",
        message:
          "must be a JSON array of nonzero 64-character hexadecimal keys",
      });
      return z.NEVER;
    }
  });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  API_ORIGIN: z.string().url().default("http://localhost:4000"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/finsight"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .refine(
      (secret) =>
        !/change[-_ ]?me|local-development-secret|default[-_ ]?secret|your[-_ ]?secret/i.test(
          secret,
        ) && !/^(.)\1*$/.test(secret),
      "must be a generated secret, not a known default",
    ),
  HOSTED_LOCAL: z.enum(["true", "false"]).default("false"),
  FIELD_ENCRYPTION_KEY: encryptionKey,
  FIELD_ENCRYPTION_PREVIOUS_KEYS: previousKeys,
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z
    .string()
    .min(1)
    .default("FinSight Local <hello@finsight.local>"),
  PRIVACY_CONTACT_EMAIL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().email().optional(),
  ),
  GRIEVANCE_OFFICER_NAME: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  TRUSTED_PROXY: z.string().optional(),
  GOOGLE_CLIENT_ID: optional(z.string().min(1)),
  GOOGLE_CLIENT_SECRET: optional(z.string().min(1)),
  RAZORPAY_KEY_ID: optional(z.string().regex(/^rzp_(test|live)_[A-Za-z0-9]+$/)),
  RAZORPAY_KEY_SECRET: optional(z.string().min(16)),
  RAZORPAY_WEBHOOK_SECRET: optional(z.string().min(32)),
  RAZORPAY_WEBHOOK_PREVIOUS_SECRET: optional(z.string().min(32)),
  RAZORPAY_PRO_PLAN_ID: optional(z.string().regex(/^plan_[A-Za-z0-9]+$/)),
  RAZORPAY_BUSINESS_PLAN_ID: optional(z.string().regex(/^plan_[A-Za-z0-9]+$/)),
  BILLING_BUSINESS_NAME: optional(z.string().trim().min(2).max(120)),
  BILLING_BUSINESS_ADDRESS: optional(z.string().trim().min(5).max(500)),
  BILLING_GSTIN: optional(gstinSchema),
  BILLING_STATE_CODE: optional(stateCodeSchema),
  BILLING_SAC: optional(z.string().regex(/^[0-9]{6}$/)),
  SENTRY_DSN: optional(z.string().url()),
  SENTRY_RELEASE: optional(z.string().max(100)),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type ApiConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = envSchema.safeParse({
    ...env,
    API_PORT: env.API_PORT || env.PORT,
  });
  if (!parsed.success) {
    throw new Error(
      `FinSight API configuration invalid: ${parsed.error.issues
        .map((issue) => issue.path.join(".") + " " + issue.message)
        .join(", ")}`,
    );
  }
  const config = parsed.data;
  if (Boolean(config.GOOGLE_CLIENT_ID) !== Boolean(config.GOOGLE_CLIENT_SECRET))
    throw new Error(
      "Google OAuth requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  const billingFields = [
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
  ] as const;
  if (
    billingFields.some((field) => Boolean(config[field])) &&
    billingFields.some((field) => !config[field])
  )
    throw new Error(
      `Billing requires all of: ${billingFields.join(", ")}. Leave all blank for Free-only operation.`,
    );
  if (
    config.BILLING_GSTIN &&
    !config.BILLING_GSTIN.startsWith(config.BILLING_STATE_CODE!)
  )
    throw new Error("BILLING_GSTIN must match BILLING_STATE_CODE.");
  if (
    config.RAZORPAY_PRO_PLAN_ID &&
    config.RAZORPAY_PRO_PLAN_ID === config.RAZORPAY_BUSINESS_PLAN_ID
  )
    throw new Error("Pro and Business require distinct Razorpay plans.");
  if (
    config.HOSTED_LOCAL === "true" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(config.WEB_ORIGIN).hostname,
    )
  )
    throw new Error("HOSTED_LOCAL requires a loopback WEB_ORIGIN.");
  if (config.SMTP_USER && !config.SMTP_PASSWORD)
    throw new Error("SMTP_PASSWORD is required with SMTP_USER.");
  if (config.NODE_ENV === "production") {
    if (
      !env.MONGODB_URI ||
      !env.REDIS_URL ||
      !env.BETTER_AUTH_SECRET ||
      !env.FIELD_ENCRYPTION_KEY
    )
      throw new Error(
        "Production requires explicit MONGODB_URI, REDIS_URL, BETTER_AUTH_SECRET and FIELD_ENCRYPTION_KEY.",
      );
    if (!config.MONGODB_URI.startsWith("mongodb"))
      throw new Error("MONGODB_URI must be a MongoDB connection string.");
    if (
      config.HOSTED_LOCAL !== "true" &&
      new URL(config.WEB_ORIGIN).protocol !== "https:"
    )
      throw new Error("WEB_ORIGIN must use HTTPS in production.");
    if (
      config.HOSTED_LOCAL !== "true" &&
      (!config.PRIVACY_CONTACT_EMAIL || !config.GRIEVANCE_OFFICER_NAME)
    )
      throw new Error("Public production requires operator privacy contacts.");
  }
  return config;
}
