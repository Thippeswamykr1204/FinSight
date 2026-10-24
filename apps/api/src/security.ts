import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { Request, Response } from "express";
import { hash, verify } from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { loadConfig } from "./config.js";

const ACCESS_COOKIE = "finsight_access";
const REFRESH_COOKIE = "finsight_refresh";
const CSRF_COOKIE = "finsight_csrf";
const encoder = new TextEncoder();

export type AccessClaims = { sub: string; sid: string; type: "access" };

function encryptionKey() {
  return Buffer.from(loadConfig().FIELD_ENCRYPTION_KEY, "hex");
}

export function encryptField(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptField(value: string) {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue)
    throw new Error("Encrypted value is malformed.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashPassword(password: string) {
  return hash(password, {
    type: 2,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(encoded: string, password: string) {
  return verify(encoded, password);
}

export async function issueAccessToken(userId: string, sessionId: string) {
  return new SignJWT({ sid: sessionId, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(encoder.encode(loadConfig().JWT_SECRET));
}

export async function verifyAccessToken(token: string) {
  const result = await jwtVerify(
    token,
    encoder.encode(loadConfig().JWT_SECRET),
    { algorithms: ["HS256"] },
  );
  if (
    result.payload.type !== "access" ||
    typeof result.payload.sub !== "string" ||
    typeof result.payload.sid !== "string"
  )
    throw new Error("Invalid access token.");
  return result.payload as unknown as AccessClaims;
}

export function hashRefreshToken(token: string) {
  return digest(token);
}

export function newOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string,
) {
  const config = loadConfig();
  const base = {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "lax" as const,
    domain: config.COOKIE_DOMAIN,
    path: "/",
  };
  response.cookie(ACCESS_COOKIE, accessToken, {
    ...base,
    maxAge: 15 * 60 * 1000,
  });
  response.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(response: Response) {
  const config = loadConfig();
  const base = {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "lax" as const,
    domain: config.COOKIE_DOMAIN,
    path: "/",
  };
  response.clearCookie(ACCESS_COOKIE, base);
  response.clearCookie(REFRESH_COOKIE, base);
}

export function accessTokenFrom(request: Request) {
  const authorization = request.header("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  return request.cookies?.[ACCESS_COOKIE] as string | undefined;
}

export function refreshTokenFrom(request: Request) {
  return request.cookies?.[REFRESH_COOKIE] as string | undefined;
}

export function csrfTokenFrom(request: Request) {
  return request.cookies?.[CSRF_COOKIE] as string | undefined;
}

export function ensureCsrfCookie(request: Request, response: Response) {
  const current = csrfTokenFrom(request);
  if (current) return current;
  const token = newOpaqueToken();
  const config = loadConfig();
  response.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: config.secureCookies,
    sameSite: "lax",
    domain: config.COOKIE_DOMAIN,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function sameSecret(
  left: string | undefined,
  right: string | undefined,
) {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE };
