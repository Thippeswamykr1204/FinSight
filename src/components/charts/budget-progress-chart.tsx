"use client";

import type { BudgetWithSpent } from "@/types";
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface BudgetChartProps {
  budgets: BudgetWithSpent[];
}

export function BudgetProgressChart({ budgets }: BudgetChartProps) {
  if (!budgets.length) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        No budgets set for this period
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const pct = Math.min(budget.percentage, 100);
        const color = CATEGORY_COLORS[budget.category] || "#64748b";
        const isWarning = budget.percentage >= 80 && !budget.isOverBudget;

        return (
          <div key={budget.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{CATEGORY_ICONS[budget.category]}</span>
                <span className="text-sm font-medium text-slate-200">
                  {CATEGORY_LABELS[budget.category]}
                </span>
                {budget.isOverBudget && (
                  <div className="flex items-center gap-1 text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      Over Budget
                    </span>
                  </div>
                )}
                {isWarning && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                    Warning
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-100">
                  {formatCurrency(budget.spent)}
                </span>
                <span className="text-xs text-slate-500 ml-1">
                  / {formatCurrency(budget.amount)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 rounded-full bg-slate-700/60 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  budget.isOverBudget
                    ? "bg-red-500"
                    : isWarning
                    ? "bg-amber-500"
                    : ""
                )}
                style={{
                  width: `${pct}%`,
                  backgroundColor:
                    budget.isOverBudget
                      ? undefined
                      : isWarning
                      ? undefined
                      : color,
                }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>{budget.percentage.toFixed(1)}% used</span>
              <span>
                {budget.isOverBudget
                  ? `${formatCurrency(Math.abs(budget.remaining))} over`
                  : `${formatCurrency(budget.remaining)} left`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
