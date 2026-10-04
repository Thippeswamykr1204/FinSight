import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { CACHE_TTL, getCache, setCache } from "@/lib/redis";
import type {
  CategoryStat,
  DashboardStats,
  FinancialHealth,
  MonthlyTrend,
  SpendingAnomaly,
} from "@/types";

function buildFinancialHealth(input: {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  netMonthlyCashflow: number;
  previousMonthExpenses: number;
  budgetCount: number;
  budgetAlertsCount: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
}): FinancialHealth {
  let score = 50;
  const recommendations: string[] = [];

  if (input.totalMonthlyIncome > 0 && input.netMonthlyCashflow >= 0) {
    score += 20;
  } else if (input.totalMonthlyIncome > 0 && input.netMonthlyCashflow < 0) {
    score -= 20;
    recommendations.push(
      "Reduce current-month spending or add missing income entries to bring cash flow back above zero.",
    );
  } else {
    score -= 15;
    recommendations.push(
      "Track at least one income source so FinSight can measure cash flow accurately.",
    );
  }

  if (input.budgetCount > 0) {
    score += 10;
  } else if (input.expenseTransactionCount > 0) {
    recommendations.push("Set category budgets to catch overspending earlier.");
  }

  if (input.budgetAlertsCount === 0) {
    score += 10;
  } else {
    score -= Math.min(15, input.budgetAlertsCount * 5);
    recommendations.push(
      "Review the categories near or over budget and trim discretionary spending.",
    );
  }

  if (
    input.previousMonthExpenses > 0 &&
    input.totalMonthlyExpenses <= input.previousMonthExpenses
  ) {
    score += 10;
  } else if (
    input.previousMonthExpenses > 0 &&
    input.totalMonthlyExpenses > input.previousMonthExpenses * 1.1
  ) {
    score -= 10;
    recommendations.push(
      "Spending increased noticeably vs last month. Check your top category and see if it can be reduced.",
    );
  }

  if (input.incomeTransactionCount > 0 && input.expenseTransactionCount > 0) {
    score += 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (recommendations.length === 0) {
    recommendations.push(
      "Keep logging income, expenses, and budgets regularly to maintain a reliable monthly picture.",
    );
  }

  if (score >= 75) {
    return {
      score,
      label: "Strong",
      summary:
        "Your current setup shows healthy cash flow and solid control over spending.",
      recommendations,
    };
  }

  if (score >= 50) {
    return {
      score,
      label: "Stable",
      summary:
        "Your finances look manageable, with a few clear opportunities to improve consistency.",
      recommendations,
    };
  }

  return {
    score,
    label: "Needs Attention",
    summary:
      "Your current numbers suggest cash flow or budget discipline needs attention this month.",
    recommendations,
  };
}

export async function getDashboardStats(
  month: number,
  year: number,
): Promise<DashboardStats> {
  const cacheKey = `dashboard:${month}:${year}`;
  const cached = await getCache<DashboardStats>(cacheKey);
  if (cached) return cached;

  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const previousMonthDate = subMonths(new Date(year, month - 1), 1);
  const previousMonthStart = startOfMonth(previousMonthDate);
  const previousMonthEnd = endOfMonth(previousMonthDate);

  const [
    monthlyTransactions,
    previousMonthTransactions,
    recentTransactions,
    budgets,
    recurringTemplates,
    trendData,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
    }),
    prisma.transaction.findMany({
      where: {
        type: "EXPENSE",
        date: { gte: previousMonthStart, lte: previousMonthEnd },
      },
      select: { amount: true },
    }),
    prisma.transaction.findMany({
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.budget.findMany({
      where: { month, year },
    }),
    prisma.transaction.count({
      where: {
        recurrenceFrequency: "MONTHLY",
        recurringSeriesId: { not: null },
      },
    }),
    prisma.transaction.findMany({
      where: {
        date: {
          gte: startOfMonth(subMonths(new Date(year, month - 1), 5)),
          lte: monthEnd,
        },
      },
      select: { amount: true, date: true, type: true },
    }),
  ]);

  const totalMonthlyExpenses = monthlyTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === "EXPENSE" ? transaction.amount : 0),
    0,
  );
  const totalMonthlyIncome = monthlyTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === "INCOME" ? transaction.amount : 0),
    0,
  );
  const netMonthlyCashflow = totalMonthlyIncome - totalMonthlyExpenses;
  const previousMonthExpenses = previousMonthTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const incomeTransactionCount = monthlyTransactions.filter(
    (transaction) => transaction.type === "INCOME",
  ).length;
  const expenseTransactions = monthlyTransactions.filter(
    (transaction) => transaction.type === "EXPENSE",
  );
  const expenseTransactionCount = expenseTransactions.length;

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const transaction of expenseTransactions) {
    const existing = categoryMap.get(transaction.category) || {
      total: 0,
      count: 0,
    };
    categoryMap.set(transaction.category, {
      total: existing.total + transaction.amount,
      count: existing.count + 1,
    });
  }

  const categoryBreakdown: CategoryStat[] = Array.from(
    categoryMap.entries(),
  ).map(([category, { total, count }]) => ({
    category: category as CategoryStat["category"],
    total,
    count,
    percentage:
      totalMonthlyExpenses > 0 ? (total / totalMonthlyExpenses) * 100 : 0,
  }));

  const trendMap = new Map<
    string,
    { total: number; year: number; monthNum: number }
  >();
  for (const transaction of trendData) {
    if (transaction.type !== "EXPENSE") continue;
    const key = format(transaction.date, "MMM yyyy");
    const existing = trendMap.get(key) || {
      total: 0,
      year: transaction.date.getFullYear(),
      monthNum: transaction.date.getMonth() + 1,
    };
    trendMap.set(key, {
      ...existing,
      total: existing.total + transaction.amount,
    });
  }

  const monthlyTrend: MonthlyTrend[] = Array.from(trendMap.entries())
    .map(([label, { total, year: trendYear, monthNum }]) => ({
      month: label,
      total,
      year: trendYear,
      monthNum,
    }))
    .sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.monthNum - b.monthNum,
    );

  const budgetAlerts = budgets
    .map((budget) => {
      const spent = categoryMap.get(budget.category)?.total || 0;
      const percentage = (spent / budget.amount) * 100;

      return {
        category: budget.category as CategoryStat["category"],
        budgetAmount: budget.amount,
        spent,
        percentage,
      };
    })
    .filter((alert) => alert.percentage >= 80)
    .sort((a, b) => b.percentage - a.percentage);

  const averageExpense =
    expenseTransactions.length > 0
      ? totalMonthlyExpenses / expenseTransactions.length
      : 0;
  const spendingAnomalies: SpendingAnomaly[] = expenseTransactions
    .filter((transaction) => {
      const categoryTotal = categoryMap.get(transaction.category)?.total || 0;
      const isLargeComparedToAverage =
        averageExpense > 0 && transaction.amount >= averageExpense * 2.2;
      const dominatesCategory =
        categoryTotal > 0 &&
        transaction.amount / categoryTotal >= 0.6 &&
        transaction.amount >= averageExpense * 1.2;
      return isLargeComparedToAverage || dominatesCategory;
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((transaction) => {
      const isLargeComparedToAverage =
        averageExpense > 0 && transaction.amount >= averageExpense * 2.2;
      return {
        transactionId: transaction.id,
        description: transaction.description,
        category: transaction.category as SpendingAnomaly["category"],
        amount: transaction.amount,
        date: transaction.date.toISOString(),
        reason: isLargeComparedToAverage
          ? "Much higher than your average expense this month"
          : "Makes up a large share of its category this month",
      };
    });

  const financialHealth = buildFinancialHealth({
    totalMonthlyIncome,
    totalMonthlyExpenses,
    netMonthlyCashflow,
    previousMonthExpenses,
    budgetCount: budgets.length,
    budgetAlertsCount: budgetAlerts.length,
    incomeTransactionCount,
    expenseTransactionCount,
  });

  const result: DashboardStats = {
    totalMonthlyIncome,
    totalMonthlyExpenses,
    netMonthlyCashflow,
    previousMonthExpenses,
    totalTransactions: monthlyTransactions.length,
    incomeTransactionCount,
    expenseTransactionCount,
    budgetCount: budgets.length,
    recurringTemplateCount: recurringTemplates,
    categoryBreakdown,
    monthlyTrend,
    recentTransactions: recentTransactions.map((transaction) => ({
      ...transaction,
      date: transaction.date.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    })),
    budgetAlerts,
    financialHealth,
    spendingAnomalies,
  };

  await setCache(cacheKey, result, CACHE_TTL.DASHBOARD);
  return result;
}
