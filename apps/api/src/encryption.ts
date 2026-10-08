import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { loadConfig } from "./config";
export const encryptionKeyId = (key: string) =>
  createHash("sha256")
    .update(Buffer.from(key, "hex"))
    .digest("hex")
    .slice(0, 16);

export function encryptSecret(plain: string, purpose = "email") {
  const key = loadConfig().FIELD_ENCRYPTION_KEY;
  const keyId = encryptionKeyId(key);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(Buffer.from(`v2.${keyId}.${purpose}`));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    "v2",
    keyId,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}
export function decryptSecret(envelope: string, purpose = "email") {
  const config = loadConfig();
  const keys = [
    config.FIELD_ENCRYPTION_KEY,
    ...config.FIELD_ENCRYPTION_PREVIOUS_KEYS,
  ];
  const parts = envelope.split(".");
  const version = parts[0];
  const keyId = version === "v2" ? parts[1] : undefined;
  const [iv, tag, body] = parts.slice(version === "v2" ? 2 : 1);
  if (
    !["v1", "v2"].includes(version) ||
    parts.length !== (version === "v2" ? 5 : 4) ||
    !iv ||
    !tag ||
    body === undefined ||
    !/^[A-Za-z0-9_-]+$/.test(iv) ||
    !/^[A-Za-z0-9_-]+$/.test(tag) ||
    !/^[A-Za-z0-9_-]*$/.test(body) ||
    Buffer.from(iv, "base64url").length !== 12 ||
    Buffer.from(tag, "base64url").length !== 16
  )
    throw new Error("Invalid encrypted envelope.");
  const candidates = keyId
    ? keys.filter((key) => encryptionKeyId(key) === keyId)
    : keys;
  if (!candidates.length)
    throw new Error("Encrypted field key is unavailable.");
  for (const key of candidates) {
    try {
      const cipher = createDecipheriv(
        "aes-256-gcm",
        Buffer.from(key, "hex"),
        Buffer.from(iv, "base64url"),
      );
      cipher.setAAD(
        Buffer.from(version === "v2" ? `v2.${keyId}.${purpose}` : purpose),
      );
      cipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([
        cipher.update(Buffer.from(body, "base64url")),
        cipher.final(),
      ]).toString("utf8");
    } catch {
      // Old v1 envelopes have no key id; authentication selects the correct key.
    }
  }
  throw new Error("Encrypted field authentication failed.");
}
