import { Activity, AlertTriangle, CheckCircle2, Lightbulb, Radar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMonth, CATEGORY_LABELS } from "@/lib/utils";
import { getDashboardStats } from "@/lib/dashboard";
import type { DashboardStats } from "@/types";

export default async function InsightsPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthLabel = formatMonth(month, year);
  let stats: DashboardStats | null = null;

  try {
    stats = await getDashboardStats(month, year);
  } catch {
    stats = null;
  }

  if (!stats) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-slate-400">Failed to load insights. Is the database connected?</p>
      </div>
    );
  }

  const topCategory = [...stats.categoryBreakdown].sort((a, b) => b.total - a.total)[0];
  const expenseDelta =
    stats.previousMonthExpenses > 0
      ? ((stats.totalMonthlyExpenses - stats.previousMonthExpenses) / stats.previousMonthExpenses) * 100
      : 0;

  const insights = [
    stats.netMonthlyCashflow < 0
      ? {
          title: "Spending is ahead of income",
          body: `You are ${formatCurrency(Math.abs(stats.netMonthlyCashflow))} negative this month. Trim top categories or add current-month income entries.`,
          tone: "amber",
        }
      : null,
    stats.previousMonthExpenses > 0 && Math.abs(expenseDelta) >= 10
      ? {
          title: expenseDelta > 0 ? "Expenses jumped vs last month" : "Expenses are down vs last month",
          body: `${Math.abs(expenseDelta).toFixed(0)}% ${expenseDelta > 0 ? "higher" : "lower"} than last month. ${topCategory ? `Top expense category is still ${CATEGORY_LABELS[topCategory.category]}.` : ""}`,
          tone: expenseDelta > 0 ? "amber" : "emerald",
        }
      : null,
    stats.budgetCount === 0 && stats.expenseTransactionCount > 0
      ? {
          title: "No budgets set yet",
          body: "You already have spending data. Add a few budgets so FinSight can warn you before categories go over limit.",
          tone: "blue",
        }
      : null,
    stats.recurringTemplateCount > 0
      ? {
          title: "Recurring transactions are configured",
          body: `You have ${stats.recurringTemplateCount} recurring template${stats.recurringTemplateCount === 1 ? "" : "s"} ready. Generate them from the transactions page when needed.`,
          tone: "emerald",
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; body: string; tone: "amber" | "emerald" | "blue" }>;

  const setupItems = [
    {
      done: stats.totalTransactions > 0,
      title: "Add or import your first transactions",
      description: "Start with a CSV import or a couple of manual entries so the dashboard has real activity to analyze.",
      href: "/transactions",
      cta: "Open transactions",
    },
    {
      done: stats.incomeTransactionCount > 0,
      title: "Track at least one income source",
      description: "Add salary, freelance, or investment income so net cash flow becomes meaningful.",
      href: "/transactions",
      cta: "Add income",
    },
    {
      done: stats.expenseTransactionCount > 0,
      title: "Capture your spending categories",
      description: "Record food, rent, travel, shopping, or entertainment expenses to see category insights.",
      href: "/transactions",
      cta: "Log expenses",
    },
    {
      done: stats.budgetCount > 0,
      title: "Set at least one budget",
      description: "Budgets turn the tracker into a planning tool and unlock alerts when spending gets close to the limit.",
      href: "/budgets",
      cta: "Set budgets",
    },
  ];

  const completedSetupCount = setupItems.filter((item) => item.done).length;
  const healthTone =
    stats.financialHealth.label === "Strong"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : stats.financialHealth.label === "Stable"
        ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
        : "border-amber-500/20 bg-amber-500/10 text-amber-300";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-700/50 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <Lightbulb className="h-3.5 w-3.5" />
              Support view
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-100">Insights for {monthLabel}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Keep the dashboard focused on core numbers and use this page to review reminders, unusual spending, and setup progress.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Insight Cards</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{insights.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/50 bg-slate-950/60 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Setup Complete</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">
                {completedSetupCount}/{setupItems.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              <CardTitle>Financial Health Score</CardTitle>
            </div>
            <CardDescription>
              A simple score based on cash flow, spending control, budgets, and consistency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
              <div className={`rounded-3xl border p-6 ${healthTone}`}>
                <p className="text-xs font-medium uppercase tracking-[0.24em]">Score</p>
                <p className="mt-3 text-5xl font-bold tracking-tight">{stats.financialHealth.score}</p>
                <p className="mt-2 text-sm font-medium">{stats.financialHealth.label}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-100">Summary</p>
                  <p className="mt-1 text-sm text-slate-400">{stats.financialHealth.summary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">Recommendations</p>
                  <div className="mt-2 space-y-2">
                    {stats.financialHealth.recommendations.map((recommendation) => (
                      <div
                        key={recommendation}
                        className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-300"
                      >
                        {recommendation}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-emerald-400" />
              <CardTitle>Insights & Reminders</CardTitle>
            </div>
            <CardDescription>Helpful nudges based on this month’s finance activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
                No urgent reminders right now. Your current month is looking steady.
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.title}
                    className={`rounded-xl border px-4 py-4 ${
                      insight.tone === "amber"
                        ? "border-amber-500/20 bg-amber-500/10"
                        : insight.tone === "blue"
                          ? "border-blue-500/20 bg-blue-500/10"
                          : "border-emerald-500/20 bg-emerald-500/10"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-100">{insight.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{insight.body}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-amber-400" />
              <CardTitle>Spending Watchlist</CardTitle>
            </div>
            <CardDescription>Expenses that stand out this month and deserve a quick review.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.spendingAnomalies.length === 0 ? (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 px-4 py-4 text-sm text-slate-300">
                No unusual spending signals this month. Your expense pattern looks consistent so far.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.spendingAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.transactionId}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-100">{anomaly.description}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{anomaly.reason}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {CATEGORY_LABELS[anomaly.category]} · {new Date(anomaly.date).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-amber-300">
                        {formatCurrency(anomaly.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <CardTitle>Setup Checklist</CardTitle>
                </div>
                <CardDescription>
                  Finish these steps to unlock the most useful cash-flow insights and alerts.
                </CardDescription>
              </div>
              <div className="inline-flex w-fit items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                {completedSetupCount}/{setupItems.length} complete
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-2">
              {setupItems.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-xl border px-4 py-4 ${
                    item.done
                      ? "border-emerald-500/20 bg-emerald-500/10"
                      : "border-slate-700/50 bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${item.done ? "text-emerald-300" : "text-slate-100"}`}>
                        {item.done ? "Done" : "Next"}: {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
                    </div>
                    <a
                      href={item.href}
                      className={`inline-flex shrink-0 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        item.done
                          ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      {item.cta}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
