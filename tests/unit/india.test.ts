import { describe, it, expect } from "vitest";
import {
  compactMoney,
  displayDate,
  financialYear,
  localDate,
  money,
  parsePaise,
  periodTotals,
  toPaise,
} from "../../src/lib/finance/region";
import { restoreDemo } from "../../src/lib/finance/storage";
import { seedState } from "../../src/lib/finance/model";
import { exportCsv, parseStatement } from "../../src/lib/finance/import-export";

describe("India money and calendar", () => {
  it("uses lakh/crore grouping and compact units, including signs and carry", () => {
    expect(money(123456700)).toBe("₹12,34,567.00");
    expect(money(3400000000)).toBe("₹3,40,00,000.00");
    expect(compactMoney(12000000)).toBe("₹1.2L");
    expect(compactMoney(3400000000)).toBe("₹3.4Cr");
    expect(compactMoney(-12000000)).toBe("−₹1.2L");
    expect(compactMoney(999999900)).toBe("₹1.0Cr");
    expect(compactMoney(1234)).toBe("₹12.34");
  });
  it("parses exact paise, Indian commas and a rupee glyph without float drift", () => {
    expect(toPaise(" ₹12,34,567.89 ")).toBe(123456789);
    expect(toPaise("1,234.5")).toBe(123450);
    expect(toPaise("0.29")).toBe(29);
    expect(toPaise("1000000000.00")).toBe(100000000000);
    for (const value of [
      "1,234,567",
      "123,45",
      "1,23",
      "1.005",
      "0",
      "-0.01",
      "+1",
      "1e2",
      ".5",
      "1.",
      "Infinity",
      "1000000000.01",
      "",
      "1 000",
      "₹₹1",
    ])
      expect(() => toPaise(value), value).toThrow();
  });
  it("only rounds explicitly requested decimal calculations, half-up at the paise boundary", () => {
    expect(parsePaise("1.005", { round: true })).toBe(101);
    expect(parsePaise("1.004999", { round: true })).toBe(100);
    expect(parsePaise("999.999", { round: true })).toBe(100000);
    expect(parsePaise("0", { allowZero: true })).toBe(0);
    expect(() => parsePaise("1000000000.005", { round: true })).toThrow();
  });
  it("uses Kolkata dates and Apr–Mar FY boundaries even across a UTC day", () => {
    expect(localDate(new Date("2026-03-31T18:30:00Z"))).toBe("2026-04-01");
    expect(financialYear(new Date("2026-03-31T18:29:59Z")).label).toBe(
      "FY 2025–26",
    );
    expect(financialYear("2026-04-01")).toMatchObject({
      start: "2026-04-01",
      end: "2027-03-31",
      label: "FY 2026–27",
    });
    expect(financialYear("2027-03-31").months).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
    ]);
    expect(displayDate("2026-04-01")).toBe("01/04/2026");
    expect(displayDate(new Date("2026-03-31T19:00:00Z"))).toBe("01/04/2026");
    expect(
      periodTotals(
        [
          { date: "2026-04-01", type: "income", amount: 100 },
          { date: "2027-03-31", type: "expense", amount: 25 },
          { date: "2026-03-31", type: "income", amount: 999 },
        ],
        "2026-04-01",
        "2027-03-31",
      ),
    ).toEqual({ income: 100, expenses: 25, saved: 75 });
  });
  it("reseeds a legacy demo without relabeling or deleting its data", () => {
    const legacy = JSON.stringify({
      version: 2,
      amount: 12345,
      locale: "en-US",
    });
    const restored = restoreDemo(null, legacy);
    expect(restored.reseeded).toBe(true);
    expect(restored.state.currency).toBe("INR");
    expect(restored.state.version).toBe(3);
    expect(legacy).toContain("12345");
    expect(restoreDemo(JSON.stringify(seedState()), legacy).reseeded).toBe(
      false,
    );
    expect(() => restoreDemo(legacy, null)).toThrow();
  });
  it("imports Indian dates and commas, exports explicit INR and rejects foreign currency", () => {
    const rows = parseStatement(
      'date,merchant,amount,currency\n31/03/2026,BESCOM,"1,234.56",INR',
      "x.csv",
      "a",
    );
    expect(rows[0]).toMatchObject({ date: "2026-03-31", amount: 123456 });
    expect(exportCsv([{ ...rows[0], id: "1" }])).toContain('"31/03/2026"');
    expect(exportCsv([{ ...rows[0], id: "1" }])).toContain('"INR"');
    expect(() =>
      parseStatement(
        "date,merchant,amount,currency\n2026-10-01,Legacy,10,USD",
        "x.csv",
        "a",
      ),
    ).toThrow("currency");
    expect(() =>
      parseStatement("<OFX><CURDEF>USD\n</OFX>", "x.ofx", "a"),
    ).toThrow("Only INR");
  });
});
