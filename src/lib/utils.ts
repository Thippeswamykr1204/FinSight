import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import type { Category, TransactionType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoney(
  amount: number,
  currency = "USD",
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM dd, yyyy");
}

export function formatMonth(month: number, year: number): string {
  return format(new Date(year, month - 1), "MMMM yyyy");
}

export const EXPENSE_CATEGORIES = [
  "FOOD",
  "RENT",
  "TRAVEL",
  "SHOPPING",
  "ENTERTAINMENT",
] as const;

export const INCOME_CATEGORIES = [
  "SALARY",
  "FREELANCE",
  "INVESTMENTS",
  "OTHER_INCOME",
] as const;

export const CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
] as const;

export const TRANSACTION_TYPES = ["EXPENSE", "INCOME"] as const;

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  EXPENSE: "Expense",
  INCOME: "Income",
};

export const CATEGORY_OPTIONS_BY_TYPE: Record<
  TransactionType,
  readonly Category[]
> = {
  EXPENSE: EXPENSE_CATEGORIES,
  INCOME: INCOME_CATEGORIES,
};

export const CATEGORY_COLORS: Record<string, string> = {
  FOOD: "#f97316",
  RENT: "#8b5cf6",
  TRAVEL: "#06b6d4",
  SHOPPING: "#ec4899",
  ENTERTAINMENT: "#22c55e",
  SALARY: "#10b981",
  FREELANCE: "#38bdf8",
  INVESTMENTS: "#f59e0b",
  OTHER_INCOME: "#94a3b8",
};

export const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Food & Dining",
  RENT: "Rent & Housing",
  TRAVEL: "Travel",
  SHOPPING: "Shopping",
  ENTERTAINMENT: "Entertainment",
  SALARY: "Salary",
  FREELANCE: "Freelance",
  INVESTMENTS: "Investments",
  OTHER_INCOME: "Other Income",
};

export const CATEGORY_ICONS: Record<string, string> = {
  FOOD: "🍽️",
  RENT: "🏠",
  TRAVEL: "✈️",
  SHOPPING: "🛍️",
  ENTERTAINMENT: "🎬",
  SALARY: "💼",
  FREELANCE: "🧾",
  INVESTMENTS: "📈",
  OTHER_INCOME: "💰",
};

export function apiResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function apiError(
  message: string,
  status = 400,
  errors?: Record<string, string[]>,
): Response {
  return Response.json({ success: false, message, errors }, { status });
}

export function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
