import { describe, expect, it } from "vitest";
import {
  amortize,
  goalMonthly,
  sipProjection,
} from "@finsight/shared/finance/calculators";
import {
  cardReminders,
  suggestCategory,
  upiReference,
} from "@finsight/shared/finance/india-rules";
import { reportShareText } from "@finsight/shared/finance/report-share";
import { parseStatement } from "@finsight/shared/finance/import-export";

describe("Indian planning", () => {
  it("reconciles every paise of loan principal and adjusts the final installment", () => {
    const loan = amortize(50000000, 9, 60);
    expect(loan.emi).toBe(1037918);
    expect(loan.schedule.at(-1)!.balance).toBe(0);
    expect(loan.schedule.reduce((sum, row) => sum + row.principal, 0)).toBe(
      50000000,
    );
    expect(loan.schedule.reduce((sum, row) => sum + row.payment, 0)).toBe(
      loan.total,
    );
    expect(
      loan.schedule.every(
        (row) => Number.isInteger(row.interest) && row.balance >= 0,
      ),
    ).toBe(true);
    const zero = amortize(10000, 0, 3);
    expect(zero.schedule.map((row) => row.payment)).toEqual([3333, 3333, 3334]);
    expect(zero.interest).toBe(0);
    expect(amortize(1, 0, 1).total).toBe(1);
  });
  it("handles zero SIP returns and complete goals, bounds terms and refuses overflowing scenarios", () => {
    expect(sipProjection(500000, 0, 12)).toEqual({
      invested: 6000000,
      value: 6000000,
      growth: 0,
    });
    expect(sipProjection(500000, 8, 120).value).toBe(91473018);
    expect(goalMonthly(10000, 0, 3)).toBe(3334);
    expect(goalMonthly(10000, 10000, 3)).toBe(0);
    for (const args of [
      [0, 9, 60],
      [100, -1, 60],
      [100, 41, 60],
      [100, 9, 0],
      [100, 9, 601],
      [100, NaN, 12],
      [100, 9, 1.5],
    ])
      expect(() => amortize(...(args as [number, number, number]))).toThrow();
    expect(() => amortize(1, 0, 12)).toThrow("paise");
    expect(() => sipProjection(100000000000, 40, 600)).toThrow("exceeds");
    expect(() => goalMonthly(10000, 10001, 12)).toThrow();
  });
  it("suggests purpose from merchants, preserves explicit categories and parses strict UPI references", () => {
    expect(suggestCategory("UPI/DR/123456789012/SWIGGY/ORDER", "expense")).toBe(
      "Dining",
    );
    expect(suggestCategory("BESCOM electricity", "expense")).toBe("Utilities");
    expect(suggestCategory("IRCTC booking", "expense")).toBe("Travel");
    expect(suggestCategory("UPI/123456789012/Person", "expense")).toBe("Other");
    expect(suggestCategory("Swiggy refund", "income")).toBe("Income");
    expect(upiReference("UPI/DR/123456789012/SWIGGY")).toBe("123456789012");
    expect(upiReference("UPI/1234567890123/A")).toBeNull();
    expect(
      parseStatement(
        "date,merchant,amount,type\n01/10/2026,UPI/DR/123456789012/Swiggy,200,expense",
        "x.csv",
        "a",
      )[0],
    ).toMatchObject({
      category: "Dining",
      note: "UPI reference: 123456789012",
    });
    expect(
      parseStatement(
        "date,merchant,amount,type,category\n01/10/2026,Swiggy,200,expense,Shopping",
        "x.csv",
        "a",
      )[0].category,
    ).toBe("Shopping");
  });
  it("only reminds credit cards due in seven days or overdue, and share text contains rounded display values", () => {
    const accounts = [
      {
        id: "a",
        name: "Card",
        type: "Credit Card" as const,
        dueDate: "2026-10-12",
      },
      {
        id: "b",
        name: "Future",
        type: "Credit Card" as const,
        dueDate: "2026-10-13",
      },
      {
        id: "c",
        name: "Savings",
        type: "Savings" as const,
        dueDate: "2026-10-05",
      },
      {
        id: "d",
        name: "Overdue",
        type: "Credit" as const,
        dueDate: "2026-10-04",
      },
    ];
    expect(
      cardReminders(accounts, "2026-10-05").map((row) => row.days),
    ).toEqual([7, -1]);
    expect(
      reportShareText(
        "FY 2026–27",
        { income: 123456700, expenses: 100, saved: 123456600 },
        "Financial-year report",
      ),
    ).toContain("Income: ₹12,34,567.00");
  });
});
