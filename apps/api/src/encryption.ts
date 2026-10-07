import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { loadConfig } from "./config";
export function encryptSecret(plain: string, purpose = "email") {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(loadConfig().FIELD_ENCRYPTION_KEY, "hex"),
    iv,
  );
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}
export function decryptSecret(envelope: string, purpose = "email") {
  const [version, iv, tag, body] = envelope.split(".");
  if (version !== "v1" || !iv || !tag || !body)
    throw new Error("Invalid encrypted envelope.");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(loadConfig().FIELD_ENCRYPTION_KEY, "hex"),
    Buffer.from(iv, "base64url"),
  );
  cipher.setAAD(Buffer.from(purpose));
  cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    cipher.update(Buffer.from(body, "base64url")),
    cipher.final(),
  ]).toString("utf8");
}
