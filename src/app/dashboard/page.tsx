import { Wallet, ReceiptText, AlertTriangle, Landmark, ArrowLeftRight } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MonthlyBarChart } from "@/components/charts/monthly-bar-chart";
import { CategoryPieChart } from "@/components/charts/category-pie-chart";
import { TransactionRow } from "@/components/ui/transaction-row";
import { formatCurrency, formatMonth, CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/utils";
import { getDashboardStats } from "@/lib/dashboard";
import type { DashboardStats } from "@/types";

export default async function DashboardPage() {
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
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="text-slate-400">Failed to load dashboard data. Is the database connected?</p>
      </div>
    );
  }

  const topCategory = stats.categoryBreakdown.sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Period header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{monthLabel}</h2>
          <p className="text-sm text-slate-400 mt-0.5">Your financial overview</p>
        </div>
        <a
          href={`/api/dashboard/report?month=${month}&year=${year}`}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
        >
          Download Report
        </a>
      </div>

      {/* Budget alerts */}
      {stats.budgetAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-amber-400">Budget Alerts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.budgetAlerts.map((alert) => (
              <div
                key={alert.category}
                className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-1.5 border border-slate-700/50"
              >
                <span>{CATEGORY_ICONS[alert.category]}</span>
                <span className="text-xs text-slate-300">
                  {CATEGORY_LABELS[alert.category]}
                </span>
                <span
                  className={`text-xs font-bold ${
                    alert.percentage >= 100 ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {alert.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Income"
          value={formatCurrency(stats.totalMonthlyIncome)}
          subtitle={monthLabel}
          icon={Landmark}
          iconColor="text-emerald-300"
          iconBg="bg-emerald-500/15"
        />
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(stats.totalMonthlyExpenses)}
          subtitle={monthLabel}
          icon={Wallet}
          iconColor="text-red-300"
          iconBg="bg-red-500/15"
        />
        <StatCard
          title="Net Cash Flow"
          value={formatCurrency(stats.netMonthlyCashflow)}
          subtitle={stats.netMonthlyCashflow >= 0 ? "Money left after spending" : "Spending exceeds income"}
          icon={ArrowLeftRight}
          iconColor={stats.netMonthlyCashflow >= 0 ? "text-emerald-300" : "text-amber-300"}
          iconBg={stats.netMonthlyCashflow >= 0 ? "bg-emerald-500/15" : "bg-amber-500/15"}
        />
        <StatCard
          title="Transactions"
          value={String(stats.totalTransactions)}
          subtitle={
            topCategory
              ? `Top expense: ${CATEGORY_LABELS[topCategory.category]}`
              : "This month"
          }
          icon={ReceiptText}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/15"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
            <CardDescription>Last 6 months of expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart data={stats.monthlyTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>{monthLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={stats.categoryBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest 5 expenses</CardDescription>
            </div>
            <a
              href="/transactions"
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View all →
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <p className="text-sm text-slate-500">No transactions yet</p>
              <a href="/transactions" className="text-xs text-emerald-400 hover:underline">
                Add your first transaction →
              </a>
            </div>
          ) : (
            <div className="space-y-1">
              {stats.recentTransactions.map((t) => (
                <TransactionRow key={t.id} transaction={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
