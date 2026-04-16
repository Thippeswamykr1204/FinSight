"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { BudgetForm } from "@/components/forms/budget-form";
import { BudgetProgressChart } from "@/components/charts/budget-progress-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatMonth, CATEGORY_LABELS, CATEGORY_ICONS, getCurrentMonthYear } from "@/lib/utils";
import type { BudgetWithSpent } from "@/types";
import { Wallet, TrendingDown } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

export default function BudgetsPage() {
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/budgets?month=${month}&year=${year}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setBudgets(json.data);
    } catch (e: any) {
      setError(e.message || "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  async function deleteBudget(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/budgets?id=${id}`, { method: "DELETE" });
      await fetchBudgets();
    } catch {
    } finally {
      setDeleting(null);
    }
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = budgets.filter((b) => b.isOverBudget).length;
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-36">
            <Select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </Select>
          </div>
          <div className="w-24">
            <Select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Set Budget
        </Button>
      </div>

      {/* Summary cards */}
      {!loading && budgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Budget"
            value={formatCurrency(totalBudget)}
            subtitle={formatMonth(month, year)}
            icon={Wallet}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/15"
          />
          <StatCard
            title="Total Spent"
            value={formatCurrency(totalSpent)}
            subtitle={`${((totalSpent / totalBudget) * 100).toFixed(1)}% of budget`}
            icon={TrendingDown}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/15"
          />
          <StatCard
            title="Over Budget"
            value={`${overBudgetCount} / ${budgets.length}`}
            subtitle="Categories exceeded"
            icon={AlertTriangle}
            iconColor={overBudgetCount > 0 ? "text-red-400" : "text-emerald-400"}
            iconBg={overBudgetCount > 0 ? "bg-red-500/15" : "bg-emerald-500/15"}
          />
        </div>
      )}

      {/* Alerts */}
      {!loading && budgets.filter((b) => b.isOverBudget).length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-sm font-semibold text-red-400">Over-Budget Categories</p>
          </div>
          <div className="space-y-1">
            {budgets.filter((b) => b.isOverBudget).map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {CATEGORY_ICONS[b.category]} {CATEGORY_LABELS[b.category]}
                </span>
                <span className="text-red-400 font-semibold">
                  {formatCurrency(Math.abs(b.remaining))} over ({b.percentage.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress bars */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Budget vs Actual — {formatMonth(month, year)}</CardTitle>
              <CardDescription>
                {budgets.length} budget{budgets.length !== 1 ? "s" : ""} set
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-5">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            <BudgetProgressChart budgets={budgets} />
          )}
        </CardContent>
      </Card>

      {/* Budget list with delete */}
      {!loading && budgets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Budgets</CardTitle>
            <CardDescription>Edit or remove budget limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {budgets.map((budget) => (
                <div
                  key={budget.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3"
                >
                  <span className="text-lg">{CATEGORY_ICONS[budget.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">
                      {CATEGORY_LABELS[budget.category]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(budget.spent)} spent of {formatCurrency(budget.amount)}
                    </p>
                  </div>
                  {budget.isOverBudget ? (
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  <button
                    onClick={() => deleteBudget(budget.id)}
                    disabled={deleting === budget.id}
                    className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Set Budget"
        description="Define a spending limit for a category"
      >
        <BudgetForm
          month={month}
          year={year}
          onSuccess={() => {
            setAddOpen(false);
            fetchBudgets();
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  );
}
