import { describe, expect, it } from "vitest";
import {
  accountBalance,
  budgetSchema,
  cashFlow,
  localDate,
  money,
  seedState,
  stateSchema,
  summarize,
  toPaise,
  transactionSchema,
} from "../../src/lib/finance/model";
import {
  exportCsv,
  parseStatement,
  uniqueImports,
} from "../../src/lib/finance/import-export";

describe("financial domain", () => {
  it("represents money as integer minor units without floating point accumulation", () => {
    expect(toPaise("0.10") + toPaise("0.20")).toBe(30);
    expect(toPaise("1234.5")).toBe(123450);
    for (const value of [
      "1.001",
      "-1",
      "NaN",
      "Infinity",
      "1e3",
      "0",
      "1,23,4",
      "999999999999999",
    ])
      expect(() => toPaise(value)).toThrow();
  });
  it("validates actual calendar dates and positive transaction values", () => {
    const transaction = seedState(new Date(2026, 9, 4)).transactions[0];
    expect(
      transactionSchema.safeParse({ ...transaction, date: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      transactionSchema.safeParse({ ...transaction, date: "2026-13-01" })
        .success,
    ).toBe(false);
    expect(
      transactionSchema.safeParse({ ...transaction, amount: -1 }).success,
    ).toBe(false);
    expect(
      budgetSchema.safeParse({
        id: "x",
        category: "Income",
        limit: 100,
        month: "2026-10",
      }).success,
    ).toBe(false);
    expect(
      budgetSchema.safeParse({
        id: "x",
        category: "Home",
        limit: 100,
        month: "2026-13",
      }).success,
    ).toBe(false);
  });
  it("derives totals and account balances from the same ledger", () => {
    const state = seedState(new Date(2026, 9, 4));
    state.transactions = [
      {
        ...state.transactions[0],
        id: "income",
        amount: 100000,
        type: "income",
      },
      {
        ...state.transactions[0],
        id: "expense",
        amount: 25000,
        type: "expense",
        category: "Home",
      },
    ];
    const summary = summarize(state, "2026-10");
    expect(summary.income).toBe(100000);
    expect(summary.expenses).toBe(25000);
    expect(summary.saved).toBe(75000);
    expect(
      summary.budgets.find((budget) => budget.category === "Home")?.spent,
    ).toBe(25000);
    expect(accountBalance(state, "checking")).toBe(6175000);
    expect(accountBalance(state, "missing")).toBe(0);
    expect(summary.balance).toBe(
      state.accounts.reduce(
        (sum, account) => sum + accountBalance(state, account.id),
        0,
      ),
    );
  });
  it("handles empty periods, overspending and income-free months without invalid scores", () => {
    const state = seedState();
    state.transactions = [];
    state.budgets = [];
    const empty = summarize(state);
    expect(empty.savingRate).toBe(0);
    expect(empty.income).toBe(0);
    expect(empty.score).toBe(40);
    state.transactions = [
      {
        id: "e",
        merchant: "Rent",
        date: localDate(),
        amount: 5000,
        type: "expense",
        category: "Home",
        accountId: "checking",
        note: "",
      },
    ];
    state.budgets = [
      {
        id: "b",
        category: "Home",
        limit: 1000,
        month: localDate().slice(0, 7),
      },
    ];
    const over = summarize(state);
    expect(over.remaining).toBe(-4000);
    expect(over.score).toBeLessThan(50);
    expect(cashFlow(state, 12)).toHaveLength(12);
    expect(cashFlow(state, 3).at(-1)?.expenses).toBe(50);
  });
  it("creates a valid seed with no future-dated current month entries", () => {
    const state = seedState(new Date(2026, 0, 1));
    expect(stateSchema.safeParse(state).success).toBe(true);
    expect(
      state.transactions.every(
        (transaction) => transaction.date <= "2026-01-01",
      ),
    ).toBe(true);
    expect(money(123456)).toBe("₹1,234.56");
  });
});

describe("statement import and export", () => {
  it("parses quoted fields, BOMs, embedded line breaks, signs and case-insensitive categories", () => {
    const rows = parseStatement(
      '\uFEFFdate,description,amount,category\r\n2026-10-01,"Shop, \"\"North\"\"",-12.50,food & dining\r\n2026-10-02,"Pay\ncheck",100,Income',
      "bank.csv",
      "checking",
    );
    expect(rows[0]).toMatchObject({
      merchant: 'Shop, "North"',
      amount: 1250,
      type: "expense",
      category: "Food & dining",
    });
    expect(rows[1]).toMatchObject({ merchant: "Pay\ncheck", type: "income" });
  });
  it("rejects malformed and oversized statements before import", () => {
    expect(() => parseStatement("", "x.csv", "a")).toThrow();
    expect(() => parseStatement("name,value\na,1", "x.csv", "a")).toThrow(
      "CSV needs",
    );
    expect(() =>
      parseStatement(
        'date,merchant,amount\n2026-10-01,"unfinished,1',
        "x.csv",
        "a",
      ),
    ).toThrow("closing quote");
    expect(() =>
      parseStatement(
        "date,merchant,amount,type\n2026-10-01,A,1,unknown",
        "x.csv",
        "a",
      ),
    ).toThrow("Row 2");
    expect(() =>
      parseStatement("date,merchant,amount\n2026-02-30,A,1", "x.csv", "a"),
    ).toThrow();
    expect(() =>
      parseStatement("date,merchant,amount\n2026-10-01,,1", "x.csv", "a"),
    ).toThrow();
    expect(() => parseStatement("x".repeat(2_000_001), "x.csv", "a")).toThrow(
      "2 MB",
    );
    expect(() =>
      parseStatement(
        "date,merchant,amount\n" + "2026-10-01,A,1\n".repeat(1001),
        "x.csv",
        "a",
      ),
    ).toThrow("1,000");
    expect(() => parseStatement("date,merchant,amount", "x.csv", "a")).toThrow(
      "No transactions",
    );
  });
  it("parses XML and SGML OFX", () => {
    const ofx =
      "<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20261001120000<TRNAMT>-25.90<NAME>Local market</STMTTRN><STMTTRN><DTPOSTED>20261002<TRNAMT>300<MEMO>Payment</STMTTRN></BANKTRANLIST></OFX>";
    const rows = parseStatement(ofx, "bank.ofx", "checking");
    expect(rows).toHaveLength(2);
    expect(rows[0].amount).toBe(2590);
    expect(rows[1].merchant).toBe("Payment");
    expect(() => parseStatement("<OFX></OFX>", "empty.ofx", "a")).toThrow();
  });
  it("deduplicates existing and same-file transactions but preserves separate accounts", () => {
    const row = seedState().transactions[0];
    expect(
      uniqueImports(
        [row],
        [
          { ...row },
          { ...row, accountId: "other" },
          { ...row, accountId: "other" },
        ],
      ),
    ).toHaveLength(1);
    expect(
      uniqueImports(
        [],
        [row, { ...row, merchant: ` ${row.merchant.toUpperCase()} ` }],
      ),
    ).toHaveLength(1);
  });
  it("exports round-trippable CSV and prevents spreadsheet formula execution", () => {
    const transaction = { ...seedState().transactions[0], merchant: 'A, "B"' };
    expect(
      parseStatement(
        exportCsv([transaction]),
        "export.csv",
        transaction.accountId,
      )[0],
    ).toMatchObject({
      merchant: transaction.merchant,
      amount: transaction.amount,
    });
    for (const merchant of [
      "=HYPERLINK(1)",
      "+formula",
      "@SUM(A1)",
      "-cmd",
      "  =formula",
    ])
      expect(exportCsv([{ ...transaction, merchant }])).toContain(
        `'${merchant}`,
      );
  });
});
