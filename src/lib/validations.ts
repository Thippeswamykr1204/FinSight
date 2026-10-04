import { z } from "zod/v3";

export const CATEGORIES = [
  "FOOD",
  "RENT",
  "TRAVEL",
  "SHOPPING",
  "ENTERTAINMENT",
  "SALARY",
  "FREELANCE",
  "INVESTMENTS",
  "OTHER_INCOME",
] as const;

export const EXPENSE_CATEGORIES = [
  "FOOD",
  "RENT",
  "TRAVEL",
  "SHOPPING",
  "ENTERTAINMENT",
] as const;

export const CategoryEnum = z.enum(CATEGORIES);
export const ExpenseCategoryEnum = z.enum(EXPENSE_CATEGORIES);
export const RecurrenceFrequencyEnum = z.enum(["MONTHLY"]);
export const TransactionTypeEnum = z.enum(["EXPENSE", "INCOME"]);

const optionalQueryValue = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, schema.optional());

const transactionBaseSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .max(1_000_000, "Amount too large"),
  date: z.coerce.date({ invalid_type_error: "Invalid date" }),
  description: z
    .string()
    .min(2, "Description must be at least 2 characters")
    .max(200, "Description too long"),
  type: TransactionTypeEnum.default("EXPENSE"),
  category: CategoryEnum,
  recurrenceFrequency: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    RecurrenceFrequencyEnum.optional(),
  ),
});

function validateTransactionCategory(
  data: { type?: "EXPENSE" | "INCOME"; category?: string },
  ctx: z.RefinementCtx,
) {
  if (!data.type || !data.category) return;
  const isExpenseCategory = (EXPENSE_CATEGORIES as readonly string[]).includes(
    data.category,
  );
  if (data.type === "EXPENSE" && !isExpenseCategory) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose an expense category",
      path: ["category"],
    });
  }

  if (data.type === "INCOME" && isExpenseCategory) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose an income category",
      path: ["category"],
    });
  }
}

export const transactionSchema = transactionBaseSchema.superRefine(
  validateTransactionCategory,
);

export const transactionUpdateSchema = transactionBaseSchema
  .partial()
  .superRefine(validateTransactionCategory);

export const budgetSchema = z.object({
  category: ExpenseCategoryEnum,
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Budget must be positive")
    .max(1_000_000, "Budget too large"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: optionalQueryValue(TransactionTypeEnum),
    category: optionalQueryValue(CategoryEnum),
    search: optionalQueryValue(z.string().trim().max(200)),
    startDate: optionalQueryValue(z.coerce.date()),
    endDate: optionalQueryValue(z.coerce.date()),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return data.startDate <= data.endDate;
    },
    {
      message: "Start date must be before end date",
      path: ["endDate"],
    },
  );

export type TransactionInput = z.infer<typeof transactionSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
