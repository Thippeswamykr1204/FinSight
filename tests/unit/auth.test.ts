import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  isAuthConfigured,
  verifySessionToken,
} from "../../src/lib/auth";

describe("retained legacy session boundary", () => {
  beforeEach(() => {
    vi.stubEnv("APP_PASSWORD", "test-only-password");
    vi.stubEnv(
      "AUTH_SECRET",
      "test-only-signing-key-with-at-least-32-characters",
    );
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });
  it("requires a signing key separate from the password", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    expect(isAuthConfigured()).toBe(false);
    expect(await verifySessionToken()).toBe(false);
  });
  it("accepts a signed unexpired token and rejects changed or malformed tokens", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
    const [payload, signature] = token.split(".");
    expect(
      await verifySessionToken(`${payload}.AAAA${signature.slice(4)}`),
    ).toBe(false);
    expect(await verifySessionToken(`${token}.extra`)).toBe(false);
    expect(await verifySessionToken("bad.signature")).toBe(false);
    expect(await verifySessionToken("missing-separator")).toBe(false);
  });
  it("expires tokens and rejects them after key rotation", async () => {
    const token = await createSessionToken();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(await verifySessionToken(token)).toBe(false);
    vi.useRealTimers();
    vi.stubEnv("AUTH_SECRET", "different-test-key-with-at-least-32-characters");
    expect(await verifySessionToken(token)).toBe(false);
  });
});
