import { z } from "zod";
import {
  accountSchema,
  budgetSchema,
  goalSchema,
  transactionSchema,
  paise,
  type Account,
} from "@/lib/finance/model";

export const id = z.string().min(1).max(100);
export const newTransaction = transactionSchema.omit({ id: true }).strict();
export const commandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("account.reminder"),
      id,
      dueDate: accountSchema.shape.dueDate,
    })
    .strict(),
  z
    .object({
      action: z.literal("account.create"),
      data: accountSchema.omit({ id: true }).strict(),
    })
    .strict(),
  z
    .object({ action: z.literal("transaction.create"), data: newTransaction })
    .strict(),
  z
    .object({
      action: z.literal("transaction.update"),
      id,
      version: z.number().int().positive(),
      data: newTransaction,
    })
    .strict(),
  z
    .object({
      action: z.literal("transaction.delete"),
      id,
      version: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      action: z.literal("transaction.import"),
      rows: z.array(newTransaction).min(1).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("budget.set"),
      data: budgetSchema.omit({ id: true }).strict(),
    })
    .strict(),
  z.object({ action: z.literal("budget.delete"), id }).strict(),
  z
    .object({
      action: z.literal("goal.create"),
      data: goalSchema.omit({ id: true, saved: true }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("goal.contribute"),
      id,
      amount: paise.positive(),
    })
    .strict(),
]);
export type FinanceCommand = z.infer<typeof commandSchema>;
export const workspaceSchema = z
  .object({ name: z.string().trim().min(2).max(80) })
  .strict();
export const invitationSchema = z
  .object({
    email: z
      .string()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
  })
  .strict();
export const memberRoleSchema = z
  .object({ userId: id, role: z.enum(["ADMIN", "EDITOR", "VIEWER"]) })
  .strict();

export interface HostedAccount {
  id: string;
  name: string;
  type: Account["type"];
  dueDate: string | null;
  openingBalance: number;
  balance: number;
}
export interface HostedEntry {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  category: string;
  accountId: string;
  note: string;
  version: number;
}
export interface HostedBudget {
  id: string;
  category: string;
  month: string;
  limit: number;
  spent: number;
}
export interface HostedGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  due: string;
}
export interface Overview {
  financialYear: {
    label: string;
    start: string;
    end: string;
    income: number;
    expenses: number;
    saved: number;
  };
  workspace: { id: string; name: string; currency: string; revision: number };
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";
  income: number;
  expenses: number;
  balance: number;
  accounts: HostedAccount[];
  budgets: HostedBudget[];
  goals: HostedGoal[];
  members: Array<{
    userId: string;
    role: string;
    user: { name: string; email: string };
  }>;
  history: Array<{ month: string; income: number; expenses: number }>;
}
