import { z } from "zod";
import { region, localDate } from "./region";
export { money, toPaise, localDate } from "./region";

export const categories = [
  "Groceries",
  "Dining",
  "Rent",
  "UPI/Transfers",
  "Utilities",
  "Mobile/DTH/Internet",
  "Fuel",
  "EMI/Loans",
  "Insurance",
  "Medical",
  "Education/School fees",
  "Domestic help",
  "Entertainment",
  "SIP/Mutual funds",
  "Gold",
  "Taxes",
  "Donations/Gifts",
  "Home",
  "Food & dining",
  "Transport",
  "Subscriptions",
  "Travel",
  "Shopping",
  "Health",
  "Income",
  "Other",
] as const;
export const categoryColors: Record<string, string> = {
  Groceries: "#178457",
  Dining: "#be603a",
  Rent: "#4c6fff",
  "UPI/Transfers": "#687c72",
  Utilities: "#367d98",
  "Mobile/DTH/Internet": "#8467ce",
  Fuel: "#be603a",
  "EMI/Loans": "#4c6fff",
  Insurance: "#448079",
  Medical: "#448079",
  "Education/School fees": "#8467ce",
  "Domestic help": "#367d98",
  Entertainment: "#be5a84",
  "SIP/Mutual funds": "#178457",
  Gold: "#ac512a",
  Taxes: "#687c72",
  "Donations/Gifts": "#be5a84",
  Home: "#4c6fff",
  "Food & dining": "#178457",
  Transport: "#be603a",
  Subscriptions: "#8467ce",
  Travel: "#367d98",
  Shopping: "#be5a84",
  Health: "#448079",
  Income: "#178457",
  Other: "#687c72",
};
export const paise = z.number().int().safe().nonnegative().max(region.maxMinor);
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value,
    "Enter a valid date",
  );
export const transactionSchema = z.object({
  id: z.string().min(1),
  merchant: z.string().trim().min(1).max(120),
  amount: paise.positive(),
  date: isoDate,
  type: z.enum(["income", "expense"]),
  category: z.enum(categories),
  accountId: z.string().min(1),
  note: z.string().max(500).default(""),
  version: z.number().int().positive().optional(),
});
export const budgetSchema = z.object({
  id: z.string().min(1),
  category: z
    .enum(categories)
    .refine((value) => value !== "Income", "Income is not a spending budget"),
  limit: paise.positive(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});
export const goalSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  saved: paise,
  target: paise.positive(),
  due: isoDate,
});
export const accountTypes = [
  "Savings",
  "Current",
  "Credit Card",
  "UPI wallet",
  "FD",
  "RD",
  "PPF",
  "EPF",
  "NPS",
  "Gold",
  "Mutual funds",
  "Loan",
  "Cash",
  "Credit",
  "Investments",
] as const;
export const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  type: z.enum(accountTypes),
  dueDate: isoDate.nullable().default(null),
  openingBalance: z
    .number()
    .int()
    .safe()
    .min(-100_000_000_000)
    .max(100_000_000_000),
});
export const stateSchema = z.object({
  version: z.literal(3),
  currency: z.literal(region.currency),
  timeZone: z.literal(region.timeZone),
  name: z.string().trim().min(1).max(60),
  transactions: z.array(transactionSchema).max(10000),
  budgets: z.array(budgetSchema).max(500),
  goals: z.array(goalSchema).max(100),
  accounts: z.array(accountSchema).max(100),
  onboarded: z.boolean(),
  dismissed: z.array(z.string().max(120)).max(1000),
  theme: z.enum(["light", "dark"]),
  locale: z.literal(region.locale),
  notifications: z.boolean(),
  chartMonths: z.union([z.literal(3), z.literal(6), z.literal(12)]).default(6),
  scenarioMonths: z
    .union([z.literal(3), z.literal(6), z.literal(12)])
    .default(3),
});
export type Transaction = z.infer<typeof transactionSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Account = z.infer<typeof accountSchema>;
export type FinanceState = z.infer<typeof stateSchema>;
export const seasonalGoals = [
  "Diwali buffer",
  "School fees",
  "Wedding season",
  "Family festival travel",
] as const;

export function emptyState(name = "Your"): FinanceState {
  return {
    version: 3,
    currency: region.currency,
    timeZone: region.timeZone,
    name,
    transactions: [],
    accounts: [],
    budgets: [],
    goals: [],
    onboarded: false,
    dismissed: [],
    theme: "light",
    locale: region.locale,
    notifications: true,
    chartMonths: 6,
    scenarioMonths: 3,
  };
}

export function accountBalance(state: FinanceState, accountId: string) {
  return (
    (state.accounts.find((account) => account.id === accountId)
      ?.openingBalance ?? 0) +
    state.transactions
      .filter((transaction) => transaction.accountId === accountId)
      .reduce(
        (total, transaction) =>
          total +
          (transaction.type === "income"
            ? transaction.amount
            : -transaction.amount),
        0,
      )
  );
}

export function summarize(
  state: FinanceState,
  month = localDate().slice(0, 7),
) {
  const transactions = state.transactions.filter((transaction) =>
    transaction.date.startsWith(month),
  );
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const budgets = state.budgets
    .filter((budget) => budget.month === month)
    .map((budget) => ({
      ...budget,
      spent: transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" &&
            transaction.category === budget.category,
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    }));
  const saved = income - expenses;
  const savingRate = income ? Math.round((saved / income) * 100) : 0;
  const balance = state.accounts.reduce(
    (total, account) => total + accountBalance(state, account.id),
    0,
  );
  const score = Math.max(
    0,
    Math.min(
      100,
      40 +
        Math.min(35, Math.max(-30, savingRate)) +
        (budgets.length ? 15 : 0) -
        budgets.filter((budget) => budget.spent > budget.limit).length * 8 +
        (income > 0 ? 10 : 0),
    ),
  );
  return {
    transactions,
    income,
    expenses,
    saved,
    savingRate,
    budgets,
    balance,
    score,
    remaining: budgets.reduce(
      (sum, budget) => sum + budget.limit - budget.spent,
      0,
    ),
  };
}

export function cashFlow(
  state: FinanceState,
  months: number,
  now = new Date(),
) {
  const today = localDate(now);
  const year = Number(today.slice(0, 4));
  const monthIndex = Number(today.slice(5, 7)) - 1;
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex - months + index + 1, 1));
    const summary = summarize(state, localDate(date).slice(0, 7));
    return {
      month: new Intl.DateTimeFormat(state.locale, {
        month: "short",
        timeZone: region.timeZone,
      }).format(date),
      income: summary.income / 100,
      expenses: summary.expenses / 100,
      saved: summary.saved / 100,
    };
  });
}
