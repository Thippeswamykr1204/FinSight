import { describe, expect, it } from "vitest";
import { nextOccurrence } from "@finsight/shared";

describe("recurring calendar dates", () => {
  it("advances daily and weekly dates across years", () => {
    expect(nextOccurrence("2026-12-31", "daily")).toBe("2027-01-01");
    expect(nextOccurrence("2026-12-28", "weekly")).toBe("2027-01-04");
  });
  it("clamps short months without losing the original day", () => {
    expect(nextOccurrence("2026-01-31", "monthly", 31)).toBe("2026-02-28");
    expect(nextOccurrence("2026-02-28", "monthly", 31)).toBe("2026-03-31");
    expect(nextOccurrence("2028-01-31", "monthly", 31)).toBe("2028-02-29");
    expect(nextOccurrence("2026-12-31", "monthly", 31)).toBe("2027-01-31");
  });
  it("preserves yearly leap-day anchors", () => {
    expect(nextOccurrence("2028-02-29", "yearly", 29, 2)).toBe("2029-02-28");
    expect(nextOccurrence("2031-02-28", "yearly", 29, 2)).toBe("2032-02-29");
  });
});
