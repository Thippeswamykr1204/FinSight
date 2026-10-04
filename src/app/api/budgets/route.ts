import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validations";
import { apiResponse, apiError, getCurrentMonthYear } from "@/lib/utils";
import { getCache, setCache, invalidateCache, CACHE_TTL } from "@/lib/redis";
import { startOfMonth, endOfMonth } from "date-fns";
import type { BudgetWithSpent } from "@/types";
import type { ExpenseCategory } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(
      searchParams.get("month") || String(now.getMonth() + 1),
    );
    const year = parseInt(
      searchParams.get("year") || String(now.getFullYear()),
    );

    const cacheKey = `budgets:${month}:${year}`;
    const cached = await getCache<BudgetWithSpent[]>(cacheKey);
    if (cached) return apiResponse(cached);

    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    const [budgets, spendingByCategory] = await Promise.all([
      prisma.budget.findMany({ where: { month, year } }),
      prisma.transaction.groupBy({
        by: ["category"],
        where: { date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
    ]);

    const spentMap = new Map(
      spendingByCategory.map((s) => [s.category, s._sum.amount || 0]),
    );

    const result: BudgetWithSpent[] = budgets.map((budget) => {
      const spent = spentMap.get(budget.category) || 0;
      const remaining = budget.amount - spent;
      const percentage = (spent / budget.amount) * 100;

      return {
        ...budget,
        category: budget.category as ExpenseCategory,
        createdAt: budget.createdAt.toISOString(),
        updatedAt: budget.updatedAt.toISOString(),
        spent,
        remaining,
        percentage,
        isOverBudget: spent > budget.amount,
      };
    });

    await setCache(cacheKey, result, CACHE_TTL.BUDGETS);
    return apiResponse(result);
  } catch (error) {
    console.error("[BUDGETS_GET]", error);
    return apiError("Failed to fetch budgets", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = budgetSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      return apiError("Validation failed", 422, errors);
    }

    const budget = await prisma.budget.upsert({
      where: {
        category_month_year: {
          category: parsed.data.category,
          month: parsed.data.month,
          year: parsed.data.year,
        },
      },
      update: { amount: parsed.data.amount },
      create: parsed.data,
    });

    await invalidateCache(`budgets:${budget.month}:${budget.year}`);
    await invalidateCache(`dashboard:${budget.month}:${budget.year}`);

    return apiResponse(
      {
        ...budget,
        createdAt: budget.createdAt.toISOString(),
        updatedAt: budget.updatedAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("[BUDGETS_POST]", error);
    return apiError("Failed to create/update budget", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return apiError("Budget ID required", 400);

    const budget = await prisma.budget.findUnique({ where: { id } });
    if (!budget) return apiError("Budget not found", 404);

    await prisma.budget.delete({ where: { id } });
    await invalidateCache(`budgets:${budget.month}:${budget.year}`);
    await invalidateCache(`dashboard:${budget.month}:${budget.year}`);

    return apiResponse({ deleted: true });
  } catch (error) {
    console.error("[BUDGETS_DELETE]", error);
    return apiError("Failed to delete budget", 500);
  }
}
