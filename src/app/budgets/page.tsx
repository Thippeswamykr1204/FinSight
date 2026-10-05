"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useFinance } from "@/components/finance/provider";
import {
  Empty,
  Field,
  FinanceDialog,
  FormError,
  PageHeading,
} from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import {
  budgetSchema,
  categories,
  categoryColors,
  localDate,
  money,
  summarize,
  toPaise,
  type Budget,
} from "@/lib/finance/model";

export default function BudgetsPage() {
  const { state, update, notice } = useFinance();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [error, setError] = useState("");
  const { budgets } = summarize(state, month);
  const total = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const spent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const budget = budgetSchema.parse({
        id: editing?.id ?? crypto.randomUUID(),
        category: data.get("category"),
        limit: toPaise(String(data.get("amount"))),
        month,
      });
      update((current) => ({
        ...current,
        budgets: editing
          ? current.budgets.map((item) =>
              item.id === editing.id ? budget : item,
            )
          : [...current.budgets, budget],
      }));
      setOpen(false);
      notice("Budget saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check your budget.");
    }
  }
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Your plan"
        title="Give every rupee a direction."
        description="Flexible guardrails, built around the life you actually live."
      >
        <input
          aria-label="Budget month"
          type="month"
          required
          value={month}
          onChange={(event) => {
            if (event.target.value) setMonth(event.target.value);
          }}
          className="control px-3 text-xs"
        />
        <Button
          onClick={() => {
            setEditing(null);
            setError("");
            setOpen(true);
          }}
        >
          <Plus size={15} className="mr-2" /> Add budget
        </Button>
      </PageHeading>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Planned", total],
          ["Spent in budgeted categories", spent],
          ["Remaining", total - spent],
        ].map(([label, amount]) => (
          <section className="surface p-6" key={label}>
            <p className="eyebrow leading-4">{label}</p>
            <p className="mt-5 text-3xl font-semibold tracking-tight">
              {money(Number(amount), state.locale)}
            </p>
          </section>
        ))}
      </div>
      <section className="surface p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold tracking-tight">
            Your spending plan
          </h3>
          <span className="text-xs text-[var(--ink-soft)]">
            {budgets.length} categories · INR
          </span>
        </div>
        {!budgets.length ? (
          <Empty
            title="Make room for what matters"
            description="Add your first category budget for this month. Spending will be calculated from your transactions."
          >
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Create your first budget
            </Button>
          </Empty>
        ) : (
          <div className="mt-8 space-y-8">
            {budgets.map((budget) => {
              const percent = Math.round((budget.spent / budget.limit) * 100);
              return (
                <div key={budget.id}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-muted)] text-lg"
                      style={{ color: categoryColors[budget.category] }}
                    >
                      ◒
                    </span>
                    <div className="flex-1">
                      <Link
                        href={`/transactions?category=${encodeURIComponent(budget.category)}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {budget.category}
                      </Link>
                      <p
                        className={`mt-1 text-xs ${percent > 100 ? "text-[var(--danger)]" : "text-[var(--ink-soft)]"}`}
                      >
                        {money(
                          Math.abs(budget.limit - budget.spent),
                          state.locale,
                        )}{" "}
                        {percent > 100 ? "over budget" : "remaining"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {money(budget.spent, state.locale)}{" "}
                      <span className="font-normal text-[var(--ink-soft)]">
                        / {money(budget.limit, state.locale)}
                      </span>
                    </p>
                    <button
                      aria-label={`Edit ${budget.category} budget`}
                      onClick={() => {
                        setEditing(budget);
                        setError("");
                        setOpen(true);
                      }}
                      className="rounded-lg p-2 hover:bg-[var(--surface-muted)]"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${budget.category} spending`}
                    aria-valuenow={Math.min(percent, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--surface-muted)]"
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(percent, 100)}%`,
                        background:
                          percent > 100
                            ? "var(--danger)"
                            : categoryColors[budget.category],
                      }}
                    />
                  </div>
                  <p className="mt-2 text-right text-xs text-[var(--ink-soft)]">
                    {percent}% of limit
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="rounded-2xl border bg-[var(--mint)]/40 p-6">
        <h3 className="font-semibold">A plan that stays connected.</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
          Every transaction updates its category automatically. Adjust a limit
          when your priorities change; the goal is awareness, not a perfect
          score.
        </p>
      </section>
      <FinanceDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit budget" : "Create a budget"}
        description={`Set a monthly INR limit for ${month}.`}
      >
        <form key={editing?.id ?? "new"} onSubmit={save} className="space-y-4">
          <Field label="Category">
            <select
              name="category"
              defaultValue={editing?.category ?? "Food & dining"}
              className="control px-3"
            >
              {categories
                .filter((value) => value !== "Income")
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
          </Field>
          <Field label="Monthly limit (INR)">
            <input
              required
              name="amount"
              inputMode="decimal"
              defaultValue={editing ? (editing.limit / 100).toFixed(2) : ""}
              className="control px-3"
            />
          </Field>
          <FormError error={error} />
          <div className="flex justify-between gap-2">
            {editing && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  try {
                    update((current) => ({
                      ...current,
                      budgets: current.budgets.filter(
                        (budget) => budget.id !== editing.id,
                      ),
                    }));
                    setOpen(false);
                    notice("Budget removed. Transactions are retained.");
                  } catch (caught) {
                    setError(String(caught));
                  }
                }}
              >
                <Trash2 size={14} className="mr-2" /> Remove budget
              </Button>
            )}
            <Button type="submit" className="ml-auto">
              Save budget
            </Button>
          </div>
        </form>
      </FinanceDialog>
    </div>
  );
}
