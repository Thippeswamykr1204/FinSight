import { createCipheriv, randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret, encryptionKeyId } from "./encryption";

afterEach(() => vi.unstubAllEnvs());
describe("field encryption and rotation", () => {
  it("encrypts with a key-id prefix and unique authenticated nonces", () => {
    const text = "Verification link";
    const first = encryptSecret(text);
    expect(first).toMatch(/^v2\.[a-f0-9]{16}\./);
    expect(first).not.toContain(text);
    expect(encryptSecret(text)).not.toBe(first);
    expect(decryptSecret(first)).toBe(text);
    expect(decryptSecret(encryptSecret(""))).toBe("");
    expect(() => decryptSecret(first, "different-purpose")).toThrow(
      "authentication",
    );
    const parts = first.split(".");
    parts[4] = Buffer.from("modified").toString("base64url");
    expect(() => decryptSecret(parts.join("."))).toThrow("authentication");
  });
  it("decrypts retained-key fields after rotation and rejects retired keys", () => {
    const oldKey = randomBytes(32).toString("hex");
    vi.stubEnv("FIELD_ENCRYPTION_KEY", oldKey);
    const before = encryptSecret("Pending mail");
    const newKey = randomBytes(32).toString("hex");
    vi.stubEnv("FIELD_ENCRYPTION_KEY", newKey);
    vi.stubEnv("FIELD_ENCRYPTION_PREVIOUS_KEYS", JSON.stringify([oldKey]));
    expect(decryptSecret(before)).toBe("Pending mail");
    expect(encryptSecret("New mail").split(".")[1]).toBe(
      encryptionKeyId(newKey),
    );
    vi.stubEnv("FIELD_ENCRYPTION_PREVIOUS_KEYS", "[]");
    expect(() => decryptSecret(before)).toThrow("unavailable");
  });
  it("reads authenticated v1 fields with previous keys", () => {
    const oldKey = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", oldKey, iv);
    cipher.setAAD(Buffer.from("email"));
    const body = Buffer.concat([
      cipher.update("Queued mail", "utf8"),
      cipher.final(),
    ]);
    const envelope = [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      body.toString("base64url"),
    ].join(".");
    vi.stubEnv(
      "FIELD_ENCRYPTION_PREVIOUS_KEYS",
      JSON.stringify([oldKey.toString("hex")]),
    );
    expect(decryptSecret(envelope)).toBe("Queued mail");
  });
  it.each(["v3.a.b.c", "v2.no-key.a.b.c", "v1.a.b.c.extra", "v1.a.b.c"])(
    "rejects malformed envelopes",
    (envelope) => {
      expect(() => decryptSecret(envelope)).toThrow();
    },
  );
});
