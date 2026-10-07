import { z } from "zod";

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
    .default("local-development-secret-change-me-please"),
  HOSTED_LOCAL: z.enum(["true", "false"]).default("false"),
  FIELD_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .default(
      "0000000000000000000000000000000000000000000000000000000000000000",
    ),
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z
    .string()
    .min(1)
    .default("FinSight Local <hello@finsight.local>"),
  PRIVACY_CONTACT_EMAIL: z.string().email().optional(),
  GRIEVANCE_OFFICER_NAME: z.string().min(1).optional(),
  TRUSTED_PROXY: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type ApiConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(
      `FinSight API configuration invalid: ${parsed.error.issues
        .map((issue) => issue.path.join(".") + " " + issue.message)
        .join(", ")}`,
    );
  }
  const config = parsed.data;
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
      env.BETTER_AUTH_SECRET === "local-development-secret-change-me-please"
    )
      throw new Error(
        "Production requires explicit MONGODB_URI, REDIS_URL and BETTER_AUTH_SECRET.",
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
