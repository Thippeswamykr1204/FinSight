import { createHmac, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySignature } from "./razorpay";

describe("Razorpay signature boundary", () => {
  it("authenticates exact bytes, not a reserialized JSON body", () => {
    const secret = randomBytes(32).toString("hex");
    const raw = Buffer.from('{ "event": "subscription.charged" }');
    const signature = createHmac("sha256", secret).update(raw).digest("hex");
    expect(verifySignature(raw, signature, secret)).toBe(true);
    expect(
      verifySignature(
        JSON.stringify(JSON.parse(raw.toString())),
        signature,
        secret,
      ),
    ).toBe(false);
    expect(
      verifySignature(raw, signature, randomBytes(32).toString("hex")),
    ).toBe(false);
  });
  it.each([
    undefined,
    "",
    "invalid",
    "a".repeat(63),
    "0".repeat(66),
    "g".repeat(64),
  ])(
    "rejects malformed signatures without timingSafeEqual length errors",
    (signature) => {
      expect(verifySignature("payload", signature, "secret")).toBe(false);
    },
  );
  it("binds checkout payment to the server-owned subscription", () => {
    const secret = randomBytes(32).toString("hex");
    const signature = createHmac("sha256", secret)
      .update("pay_owned|sub_owned")
      .digest("hex");
    expect(verifySignature("pay_owned|sub_owned", signature, secret)).toBe(
      true,
    );
    expect(verifySignature("pay_owned|sub_foreign", signature, secret)).toBe(
      false,
    );
  });
});
