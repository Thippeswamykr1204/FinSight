import { describe, expect, it } from "vitest";
import {
  billingProfileSchema,
  effectivePlan,
  plans,
  taxBreakdown,
  validGstin,
} from "@finsight/shared";

describe("Indian membership billing", () => {
  it("preserves the published base prices and exact 18% GST in paise", () => {
    expect(taxBreakdown("pro", "29", "29")).toEqual({
      base: 29900,
      gst: 5382,
      total: 35282,
      cgst: 2691,
      sgst: 2691,
      igst: 0,
    });
    expect(taxBreakdown("business", "29", "27")).toEqual({
      base: 79900,
      gst: 14382,
      total: 94282,
      cgst: 0,
      sgst: 0,
      igst: 14382,
    });
    for (const plan of [plans.pro, plans.business])
      expect((plan.base * 118) / 100).toBe(plan.total);
  });
  it("requires a valid GSTIN checksum and matching place of supply", () => {
    expect(validGstin("not-a-gstin")).toBe(false);
    expect(validGstin("99AAPFU0939F1ZV")).toBe(false);
    expect(validGstin("27AAPFU0939F1ZV")).toBe(true);
    expect(validGstin("27AAPFU0939F1ZW")).toBe(false);
    const profile = {
      name: "Registered customer",
      address: "Customer billing address",
      city: "Mumbai",
      postalCode: "400001",
      stateCode: "27",
      gstin: "27AAPFU0939F1ZV",
    };
    expect(billingProfileSchema.parse(profile)).toEqual(profile);
    expect(
      billingProfileSchema.parse({ ...profile, gstin: undefined }).gstin,
    ).toBe("");
    expect(
      billingProfileSchema.safeParse({ ...profile, stateCode: "29" }).success,
    ).toBe(false);
    expect(
      billingProfileSchema.safeParse({
        ...profile,
        gstin: "",
        postalCode: "000000",
      }).success,
    ).toBe(false);
  });
  it("only grants paid access through a verified, unexpired paid period", () => {
    const now = new Date("2026-10-07T00:00:00Z");
    expect(effectivePlan(null, now)).toBe("free");
    expect(effectivePlan({ paidPlan: "business" }, now)).toBe("free");
    expect(effectivePlan({ paidPlan: "business", paidThrough: now }, now)).toBe(
      "free",
    );
    expect(
      effectivePlan({ paidPlan: "business", paidThrough: "2026-11-01" }, now),
    ).toBe("business");
    expect(
      effectivePlan({ paidPlan: "unknown", paidThrough: "2026-11-01" }, now),
    ).toBe("free");
  });
});
