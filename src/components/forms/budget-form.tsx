"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EXPENSE_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/utils";
import type { Budget, ExpenseCategory } from "@/types";

interface BudgetFormProps {
  month: number;
  year: number;
  existingBudget?: Budget;
  onSuccess: (budget: Budget) => void;
  onCancel: () => void;
}

export function BudgetForm({ month, year, existingBudget, onSuccess, onCancel }: BudgetFormProps) {
  const [category, setCategory] = useState<ExpenseCategory>(existingBudget?.category ?? "FOOD");
  const [amount, setAmount] = useState(existingBudget?.amount?.toString() ?? "");
  const [errors, setErrors] = useState<{ amount?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setErrors({ amount: "Enter a valid positive budget amount" });
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount: parsed, month, year }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrors({ general: json.message || "Failed to save budget" });
        return;
      }
      onSuccess(json.data as Budget);
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {errors.general}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="budget-category">Category</Label>
        <Select
          id="budget-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          disabled={!!existingBudget}
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="budget-amount">Monthly Budget (₹)</Label>
        <Input id="budget-amount" type="number" min="1" step="1" placeholder="e.g. 5000" value={amount}
          onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
          error={errors.amount}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" loading={loading} className="flex-1">{existingBudget ? "Update" : "Set"} Budget</Button>
      </div>
    </form>
  );
}
