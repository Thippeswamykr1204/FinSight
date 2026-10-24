import { z } from "zod";

export const categories = [
  "Groceries",
  "Dining",
  "Rent",
  "Transfers",
  "Utilities",
  "Internet & mobile",
  "Fuel",
  "Loans",
  "Insurance",
  "Medical",
  "Education",
  "Entertainment",
  "Investments",
  "Taxes",
  "Home",
  "Transport",
  "Subscriptions",
  "Travel",
  "Shopping",
  "Income",
  "Other",
] as const;

export const accountTypes = [
  "Savings",
  "Current",
  "Credit card",
  "Cash",
  "UPI wallet",
  "Fixed deposit",
  "Investments",
  "Loan",
] as const;

export const categoryColors: Record<string, string> = {
  Groceries: "#4dd596",
  Dining: "#f0a37b",
  Rent: "#8295ff",
  Transfers: "#8b9a95",
  Utilities: "#57b6d4",
  "Internet & mobile": "#ac92f5",
  Fuel: "#f0a37b",
  Loans: "#8295ff",
  Insurance: "#6cc2ad",
  Medical: "#67c6d3",
  Education: "#b99af2",
  Entertainment: "#e992ba",
  Investments: "#4dd596",
  Taxes: "#8b9a95",
  Home: "#8295ff",
  Transport: "#f0a37b",
  Subscriptions: "#ac92f5",
  Travel: "#57b6d4",
  Shopping: "#e992ba",
  Income: "#4dd596",
  Other: "#8b9a95",
};

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T12:00:00.000Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    );
  }, "Enter a real calendar date");

export const minorUnits = z
  .number()
  .int()
  .safe()
  .max(100_000_000_000)
  .min(-100_000_000_000);
export const positiveMinorUnits = z
  .number()
  .int()
  .safe()
  .positive()
  .max(100_000_000_000);

export const transactionInput = z.object({
  merchant: z.string().trim().min(1).max(120),
  amount: positiveMinorUnits,
  date: isoDate,
  type: z.enum(["income", "expense"]),
  category: z.enum(categories),
  accountId: z.string().uuid(),
  note: z.string().trim().max(500).default(""),
});

export const accountInput = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(accountTypes),
  openingBalance: minorUnits,
});

export const budgetInput = z.object({
  category: z
    .enum(categories)
    .refine((value) => value !== "Income", "Income cannot be budgeted"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  limit: positiveMinorUnits,
});

export const goalInput = z.object({
  name: z.string().trim().min(1).max(80),
  target: positiveMinorUnits,
  due: isoDate,
});

export const recurrenceInput = z.object({
  merchant: z.string().trim().min(1).max(120),
  amount: positiveMinorUnits,
  type: z.enum(["income", "expense"]),
  category: z.enum(categories),
  accountId: z.string().uuid(),
  frequency: z.enum(["monthly", "yearly"]),
  nextDate: isoDate,
});

export const profileInput = z.object({
  name: z.string().trim().min(1).max(60),
});
export const preferencesInput = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  activeWorkspaceId: z.string().uuid().nullable().optional(),
});

export type Category = (typeof categories)[number];
export type AccountType = (typeof accountTypes)[number];
export type Transaction = z.infer<typeof transactionInput> & {
  id: string;
  version: number;
};
export type Account = z.infer<typeof accountInput> & {
  id: string;
  balance: number;
};
export type Budget = z.infer<typeof budgetInput> & {
  id: string;
  spent: number;
};
export type Goal = z.infer<typeof goalInput> & { id: string; saved: number };
export type Theme = "light" | "dark";

export function localDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    now,
  );
}

export function money(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function parseMoney(value: string) {
  const normalized = value.replace(/[,₹\s]/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error("Enter an amount with up to two decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Enter a non-negative amount.");
  return amount;
}

export function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

export function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${value}-01T12:00:00.000Z`));
}

export function summarize(
  accounts: Account[],
  transactions: Transaction[],
  budgets: Budget[],
  month = localDate().slice(0, 7),
) {
  const rows = transactions.filter((row) => row.date.startsWith(month));
  const income = rows
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + row.amount, 0);
  const expenses = rows
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + row.amount, 0);
  const withSpend = budgets
    .filter((budget) => budget.month === month)
    .map((budget) => ({
      ...budget,
      spent: rows
        .filter(
          (row) => row.type === "expense" && row.category === budget.category,
        )
        .reduce((sum, row) => sum + row.amount, 0),
    }));
  const saved = income - expenses;
  const savingRate = income ? Math.round((saved / income) * 100) : 0;
  const balance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const score = Math.max(
    0,
    Math.min(
      100,
      40 +
        Math.min(35, Math.max(-30, savingRate)) +
        (withSpend.length ? 15 : 0) -
        withSpend.filter((budget) => budget.spent > budget.limit).length * 8 +
        (income > 0 ? 10 : 0),
    ),
  );
  return {
    income,
    expenses,
    saved,
    savingRate,
    balance,
    score,
    remaining: withSpend.reduce(
      (sum, budget) => sum + budget.limit - budget.spent,
      0,
    ),
    budgets: withSpend,
  };
}

export function cashFlow(
  transactions: Transaction[],
  months = 6,
  now = new Date(),
) {
  const current = localDate(now).slice(0, 7);
  const [year = 0, month = 1] = current.split("-").map(Number);
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(year, month - months + index, 1));
    const key = date.toISOString().slice(0, 7);
    const rows = transactions.filter((row) => row.date.startsWith(key));
    return {
      month: monthLabel(key),
      income: rows
        .filter((row) => row.type === "income")
        .reduce((sum, row) => sum + row.amount, 0),
      expenses: rows
        .filter((row) => row.type === "expense")
        .reduce((sum, row) => sum + row.amount, 0),
    };
  });
}

export function financialYear(now = new Date()) {
  const today = localDate(now);
  const year = Number(today.slice(0, 4));
  const startYear = Number(today.slice(5, 7)) >= 4 ? year : year - 1;
  return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31` };
}

export function amortize(
  principal: number,
  annualRate: number,
  months: number,
) {
  if (
    !Number.isSafeInteger(principal) ||
    principal <= 0 ||
    annualRate < 0 ||
    annualRate > 40 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 600
  ) {
    throw new Error(
      "Use a positive amount, a 0–40% annual rate, and 1–600 months.",
    );
  }
  const monthlyRate = annualRate / 1200;
  const payment = Math.round(
    monthlyRate
      ? (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
      : principal / months,
  );
  return {
    payment,
    total: payment * months,
    interest: payment * months - principal,
  };
}

export function sipProjection(
  monthly: number,
  annualRate: number,
  months: number,
) {
  if (
    !Number.isSafeInteger(monthly) ||
    monthly <= 0 ||
    annualRate < 0 ||
    annualRate > 40 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 600
  ) {
    throw new Error(
      "Use a positive amount, a 0–40% annual rate, and 1–600 months.",
    );
  }
  const rate = annualRate / 1200;
  const invested = monthly * months;
  const value = Math.round(
    rate ? (monthly * (Math.pow(1 + rate, months) - 1)) / rate : invested,
  );
  return { invested, value, growth: value - invested };
}

export function goalMonthly(target: number, saved: number, months: number) {
  if (
    !Number.isSafeInteger(target) ||
    target <= 0 ||
    !Number.isSafeInteger(saved) ||
    saved < 0 ||
    saved > target ||
    !Number.isInteger(months) ||
    months < 1
  ) {
    throw new Error("Use a valid target, saved amount, and time horizon.");
  }
  return Math.ceil((target - saved) / months);
}
