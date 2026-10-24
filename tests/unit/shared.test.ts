import { describe, expect, it } from "vitest";
import {
  amortize,
  goalMonthly,
  parseMoney,
  sipProjection,
  summarize,
} from "@finsight/shared";

describe("money domain", () => {
  it("parses INR without introducing floating point currency", () => {
    expect(parseMoney("1,234.50")).toBe(123450);
    expect(parseMoney("0")).toBe(0);
    expect(() => parseMoney("12.345")).toThrow();
  });

  it("summarizes a month from integer minor units", () => {
    const result = summarize(
      [
        {
          id: "a",
          name: "Cash",
          type: "Cash",
          openingBalance: 10000,
          balance: 12500,
        },
      ],
      [
        {
          id: "1",
          merchant: "Salary",
          amount: 50000,
          date: "2026-10-01",
          type: "income",
          category: "Income",
          accountId: "a",
          note: "",
          version: 1,
        },
        {
          id: "2",
          merchant: "Groceries",
          amount: 12500,
          date: "2026-10-05",
          type: "expense",
          category: "Groceries",
          accountId: "a",
          note: "",
          version: 1,
        },
      ],
      [
        {
          id: "b",
          category: "Groceries",
          month: "2026-10",
          limit: 15000,
          spent: 0,
        },
      ],
      "2026-10",
    );
    expect(result.income).toBe(50000);
    expect(result.expenses).toBe(12500);
    expect(result.saved).toBe(37500);
    expect(result.budgets[0]?.spent).toBe(12500);
  });

  it("keeps planning calculators bounded and explainable", () => {
    expect(amortize(1000000, 12, 12).payment).toBeGreaterThan(0);
    expect(sipProjection(10000, 12, 12).growth).toBeGreaterThan(0);
    expect(goalMonthly(100000, 25000, 5)).toBe(15000);
    expect(() => amortize(1000000, 41, 12)).toThrow();
  });
});
