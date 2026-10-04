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
export function hostedConfig() {
  if (!isHostedEnabled()) throw new Error("Hosted mode is not enabled.");
  const result = configSchema.safeParse({
    databaseUrl: process.env.HOSTED_DATABASE_URL,
    origin: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ?? "587",
    emailFrom: process.env.EMAIL_FROM,
  });
  if (!result.success)
    throw new Error(
      "Hosted configuration is incomplete. Check the hosted environment guide.",
    );
  if (
    process.env.NODE_ENV === "production" &&
    process.env.HOSTED_LOCAL !== "true" &&
    new URL(result.data.origin).protocol !== "https:"
  )
    throw new Error("Hosted production requires an HTTPS origin.");
  return result.data;
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
