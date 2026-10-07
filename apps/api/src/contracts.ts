import { z } from "zod";
import {
  accountSchema as accountDomainSchema,
  budgetSchema as budgetDomainSchema,
  goalSchema as goalDomainSchema,
  transactionSchema as transactionDomainSchema,
  paise,
} from "@finsight/shared";

export const idSchema = z.string().trim().min(1).max(100);
export const workspaceBody = z
  .object({ name: z.string().trim().min(2).max(80) })
  .strict();
export const querySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().max(512).optional(),
    search: z.string().trim().max(120).default(""),
    category: z.string().max(40).optional(),
  })
  .strict();
export const accountInput = accountDomainSchema.omit({ id: true }).strict();
export const transactionInput = transactionDomainSchema
  .omit({ id: true })
  .strict();
export const budgetInput = budgetDomainSchema.omit({ id: true }).strict();
export const goalInput = goalDomainSchema
  .omit({ id: true, saved: true })
  .strict();
export const commandSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("account.create"), data: accountInput })
    .strict(),
  z
    .object({
      action: z.literal("account.reminder"),
      id: idSchema,
      dueDate: accountDomainSchema.shape.dueDate,
    })
    .strict(),
  z
    .object({ action: z.literal("transaction.create"), data: transactionInput })
    .strict(),
  z
    .object({
      action: z.literal("transaction.update"),
      id: idSchema,
      version: z.number().int().positive(),
      data: transactionInput,
    })
    .strict(),
  z
    .object({
      action: z.literal("transaction.delete"),
      id: idSchema,
      version: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      action: z.literal("transaction.import"),
      rows: z.array(transactionInput).min(1).max(1000),
    })
    .strict(),
  z.object({ action: z.literal("budget.set"), data: budgetInput }).strict(),
  z.object({ action: z.literal("budget.delete"), id: idSchema }).strict(),
  z.object({ action: z.literal("goal.create"), data: goalInput }).strict(),
  z
    .object({
      action: z.literal("goal.contribute"),
      id: idSchema,
      amount: paise.positive(),
    })
    .strict(),
]);
export type FinanceCommand = z.infer<typeof commandSchema>;
export const invitationInput = z
  .object({
    email: z
      .string()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
  })
  .strict();
export const roleInput = z
  .object({ userId: idSchema, role: z.enum(["ADMIN", "EDITOR", "VIEWER"]) })
  .strict();
