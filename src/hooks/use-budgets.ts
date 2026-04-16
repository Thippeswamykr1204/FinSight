"use client";

import { useState, useEffect, useCallback } from "react";
import type { BudgetWithSpent } from "@/types";
import { getCurrentMonthYear } from "@/lib/utils";

interface UseBudgetsOptions {
  month?: number;
  year?: number;
}

export function useBudgets(options: UseBudgetsOptions = {}) {
  const { month: cm, year: cy } = getCurrentMonthYear();
  const { month = cm, year = cy } = options;

  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/budgets?month=${month}&year=${year}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Request failed");
      setBudgets(json.data);
    } catch (e: any) {
      setError(e.message || "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudgetItems = budgets.filter((b) => b.isOverBudget);

  return {
    budgets,
    loading,
    error,
    refetch: fetchData,
    totalBudget,
    totalSpent,
    overBudgetItems,
    utilizationPct: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
  };
}
