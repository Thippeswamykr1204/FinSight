import { randomBytes } from "node:crypto";
import { z } from "zod";

const generatedJwt = randomBytes(32).toString("base64url");
const generatedEncryptionKey = randomBytes(32).toString("hex");

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  MONGODB_URI: z.string().default(""),
  JWT_SECRET: z.string().min(32).default(generatedJwt),
  FIELD_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .default(generatedEncryptionKey),
  REDIS_URL: z.string().optional(),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  COOKIE_DOMAIN: z.string().optional(),
  PRIVACY_CONTACT_EMAIL: z.string().email().default("privacy@example.com"),
});

export type ApiConfig = z.infer<typeof schema> & { secureCookies: boolean };

let cached: ApiConfig | undefined;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  if (cached && env === process.env) return cached;
  const parsed = schema.safeParse({
    ...env,
    API_PORT: env.API_PORT ?? env.PORT,
  });
  if (!parsed.success)
    throw new Error(
      `Invalid environment: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ")}`,
    );
  if (parsed.data.NODE_ENV === "production") {
    if (!env.MONGODB_URI)
      throw new Error("MONGODB_URI is required in production.");
    if (
      parsed.data.JWT_SECRET === generatedJwt ||
      parsed.data.FIELD_ENCRYPTION_KEY === generatedEncryptionKey
    ) {
      throw new Error(
        "JWT_SECRET and FIELD_ENCRYPTION_KEY must be explicit in production.",
      );
    }
    if (new URL(parsed.data.WEB_ORIGIN).protocol !== "https:")
      throw new Error("WEB_ORIGIN must use HTTPS in production.");
  }
  const result = {
    ...parsed.data,
    secureCookies: new URL(parsed.data.WEB_ORIGIN).protocol === "https:",
  };
  if (env === process.env) cached = result;
  return result;
}
