"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_OPTIONS_BY_TYPE,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
} from "@/lib/utils";
import type { RecurrenceFrequency, Transaction, TransactionType } from "@/types";

interface FormState {
  amount: string;
  date: string;
  description: string;
  type: TransactionType;
  category: string;
  recurrenceFrequency: "" | RecurrenceFrequency;
}

interface FormErrors {
  amount?: string;
  date?: string;
  description?: string;
  category?: string;
  general?: string;
}

interface TransactionFormProps {
  transaction?: Transaction;
  onSuccess: (tx: Transaction) => void;
  onCancel: () => void;
}

export function TransactionForm({ transaction, onSuccess, onCancel }: TransactionFormProps) {
  const [form, setForm] = useState<FormState>({
    amount: transaction?.amount?.toString() ?? "",
    date: transaction?.date
      ? format(new Date(transaction.date), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    description: transaction?.description ?? "",
    type: transaction?.type ?? "EXPENSE",
    category: transaction?.category ?? "FOOD",
    recurrenceFrequency: transaction?.recurrenceFrequency ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) newErrors.amount = "Enter a valid positive amount";
    if (amount > 1_000_000) newErrors.amount = "Amount too large";
    if (!form.date) newErrors.date = "Date is required";
    if (!form.description || form.description.length < 2) newErrors.description = "Description must be at least 2 characters";
    if (form.description.length > 200) newErrors.description = "Description is too long";
    if (!form.category) newErrors.category = "Category is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const url = transaction ? `/api/transactions/${transaction.id}` : "/api/transactions";
      const method = transaction ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          date: new Date(form.date).toISOString(),
          description: form.description.trim(),
          type: form.type,
          category: form.category,
          recurrenceFrequency: form.recurrenceFrequency || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.errors) setErrors(json.errors);
        else setErrors({ general: json.message || "Something went wrong" });
        return;
      }
      onSuccess(json.data as Transaction);
    } catch {
      setErrors({ general: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((prev) => {
      if (key === "type") {
        const nextType = value as TransactionType;
        const nextCategory = CATEGORY_OPTIONS_BY_TYPE[nextType][0];
        return { ...prev, type: nextType, category: nextCategory };
      }

      return { ...prev, [key]: value };
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {errors.general}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (₹)</Label>
        <Input id="amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={update("amount")} error={errors.amount} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={form.date} onChange={update("date")} error={errors.date} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" type="text" placeholder="e.g. Dinner at restaurant" value={form.description} onChange={update("description")} error={errors.description} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="type">Type</Label>
        <Select id="type" value={form.type} onChange={update("type")}>
          {TRANSACTION_TYPES.map((type) => (
            <option key={type} value={type}>{TRANSACTION_TYPE_LABELS[type]}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select id="category" value={form.category} onChange={update("category")} error={errors.category}>
          {CATEGORY_OPTIONS_BY_TYPE[form.type].map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="recurrenceFrequency">Repeat</Label>
        <Select id="recurrenceFrequency" value={form.recurrenceFrequency} onChange={update("recurrenceFrequency")}>
          <option value="">One-time transaction</option>
          <option value="MONTHLY">Repeat monthly</option>
        </Select>
        {form.recurrenceFrequency && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            <Repeat className="h-3.5 w-3.5" />
            Future monthly copies can be generated from the transactions page.
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" loading={loading} className="flex-1">{transaction ? "Update" : "Add"} Transaction</Button>
      </div>
    </form>
  );
}
