const textEncoder = new TextEncoder();

export const AUTH_COOKIE_NAME = "finsight_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getAuthSecret() {
  return process.env.AUTH_SECRET || "";
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function signValue(value: string) {
  const secret = getAuthSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(value),
  );
  return toBase64Url(new Uint8Array(signature));
}

export function isAuthConfigured() {
  return Boolean(
    process.env.APP_PASSWORD && (process.env.AUTH_SECRET?.length ?? 0) >= 32,
  );
}

export async function createSessionToken() {
  const payload = {
    exp: Date.now() + SESSION_DURATION_MS,
  };
  const encodedPayload = toBase64Url(
    textEncoder.encode(JSON.stringify(payload)),
  );
  const signature = await signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token?: string | null) {
  if (!token || !isAuthConfigured()) return false;
  try {
    const [encodedPayload, signature, extra] = token.split(".");
    if (!encodedPayload || !signature || extra !== undefined) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(getAuthSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      textEncoder.encode(encodedPayload),
    );
    if (!valid) return false;
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  };
}
