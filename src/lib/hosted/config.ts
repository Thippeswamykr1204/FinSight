export function isHostedEnabled() {
  return process.env.HOSTED_ENABLED === "true" || Boolean(process.env.API_URL);
}
export function hostedConfig(
  env: Record<string, string | undefined> = process.env,
) {
  return {
    origin:
      env.BETTER_AUTH_URL || env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };
}

export function validateEnvironment(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.HOSTED_ENABLED && !["true", "false"].includes(env.HOSTED_ENABLED))
    throw new Error("HOSTED_ENABLED must be true or false.");
  if (env.HOSTED_ENABLED === "true" && !env.NEXT_PUBLIC_APP_URL)
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required when hosted mode is enabled.",
    );
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
