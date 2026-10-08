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
  if (
    env.NODE_ENV === "production" &&
    (!env.API_URL || !env.NEXT_PUBLIC_APP_URL)
  )
    throw new Error("Production web requires API_URL and NEXT_PUBLIC_APP_URL.");
  for (const name of ["API_URL", "NEXT_PUBLIC_APP_URL"])
    if (env[name] && !["http:", "https:"].includes(new URL(env[name]).protocol))
      throw new Error(`${name} must be an HTTP URL.`);
}

export async function deploymentCapabilities() {
  const response = await fetch(
    `${process.env.API_URL || "http://localhost:4000"}/api/v1/capabilities`,
    { cache: "no-store", signal: AbortSignal.timeout(5_000) },
  );
  if (!response.ok) throw new Error("Deployment capabilities are unavailable.");
  const { data } = await response.json();
  return {
    google: data.google === true,
    billing: data.billing === true,
    billingTestMode: data.billingTestMode === true,
  };
}
export async function authCapabilities() {
  const capabilities = await deploymentCapabilities();
  return {
    enabled: true,
    google: capabilities.google,
    local: process.env.HOSTED_LOCAL === "true",
  };
}
