import { z } from "zod";

const configSchema = z.object({
  databaseUrl: z.string().url(),
  origin: z
    .string()
    .url()
    .transform((value) => new URL(value).origin),
  secret: z.string().min(32),
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().positive(),
  emailFrom: z.string().min(1),
});

export function isHostedEnabled() {
  return process.env.HOSTED_ENABLED === "true";
}
export function hostedConfig(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.HOSTED_ENABLED !== "true")
    throw new Error("Hosted mode is not enabled.");
  const result = configSchema.safeParse({
    databaseUrl: env.HOSTED_DATABASE_URL,
    origin: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    smtpHost: env.SMTP_HOST,
    smtpPort: env.SMTP_PORT || "587",
    emailFrom: env.EMAIL_FROM,
  });
  if (!result.success) {
    const names: Record<string, string> = {
      databaseUrl: "HOSTED_DATABASE_URL",
      origin: "BETTER_AUTH_URL",
      secret: "BETTER_AUTH_SECRET (at least 32 characters)",
      smtpHost: "SMTP_HOST",
      smtpPort: "SMTP_PORT",
      emailFrom: "EMAIL_FROM",
    };
    throw new Error(
      `FinSight hosted configuration: missing or invalid ${result.error.issues.map((issue) => names[String(issue.path[0])]).join(", ")}. See .env.example.`,
    );
  }
  if (
    !["postgres:", "postgresql:"].includes(
      new URL(result.data.databaseUrl).protocol,
    )
  )
    throw new Error("HOSTED_DATABASE_URL must be a PostgreSQL URL.");
  if (env.SMTP_USER && !env.SMTP_PASSWORD)
    throw new Error("SMTP_PASSWORD is required when SMTP_USER is set.");
  if (
    env.TRUSTED_IP_HEADER &&
    !/^[a-z][a-z0-9-]{1,63}$/.test(env.TRUSTED_IP_HEADER)
  )
    throw new Error("TRUSTED_IP_HEADER must be a lowercase HTTP header name.");
  if (
    env.HOSTED_LOCAL === "true" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(result.data.origin).hostname,
    )
  )
    throw new Error("HOSTED_LOCAL is restricted to loopback origins.");
  if (
    env.NODE_ENV === "production" &&
    env.HOSTED_LOCAL !== "true" &&
    new URL(result.data.origin).protocol !== "https:"
  )
    throw new Error("Hosted production requires an HTTPS origin.");
  if (env.NODE_ENV === "production" && env.HOSTED_LOCAL !== "true") {
    if (!env.PRIVACY_CONTACT_EMAIL || !env.GRIEVANCE_OFFICER_NAME)
      throw new Error(
        "Public hosted production requires PRIVACY_CONTACT_EMAIL and GRIEVANCE_OFFICER_NAME.",
      );
    if (!z.string().email().safeParse(env.PRIVACY_CONTACT_EMAIL).success)
      throw new Error("PRIVACY_CONTACT_EMAIL must be a valid email address.");
    if (env.ENABLE_LEGACY_API === "true")
      throw new Error("ENABLE_LEGACY_API must be false for hosted production.");
  }
  return result.data;
}

export function validateEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.HOSTED_ENABLED && !["true", "false"].includes(env.HOSTED_ENABLED))
    throw new Error("HOSTED_ENABLED must be true or false.");
  if (env.HOSTED_ENABLED === "true") hostedConfig(env);
}

export function authCapabilities() {
  return {
    enabled: isHostedEnabled(),
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
    apple: Boolean(
      process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET,
    ),
    local: process.env.HOSTED_LOCAL === "true",
  };
}
