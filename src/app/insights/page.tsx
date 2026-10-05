"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Lightbulb, ShieldCheck, TrendingUp } from "lucide-react";
import { useFinance } from "@/components/finance/provider";
import { PageHeading } from "@/components/finance/primitives";
import { financialYear, periodTotals, displayDate } from "@/lib/finance/region";
import {
  cashFlow,
  categoryColors,
  money,
  summarize,
} from "@/lib/finance/model";

export default function InsightsPage() {
  const { state } = useFinance();
  const [horizon, setHorizon] = useState(3);
  const summary = summarize(state);
  const fy = financialYear();
  const yearTotals = periodTotals(state.transactions, fy.start, fy.end);
  const previous = cashFlow(state, 4).slice(0, 3);
  const monthlyNet = Math.round(
    previous.reduce((sum, month) => sum + month.saved * 100, 0) / 3,
  );
  const projected = summary.balance + monthlyNet * horizon;
  const groups = Object.entries(
    summary.transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce<Record<string, number>>(
        (totals, transaction) => ({
          ...totals,
          [transaction.category]:
            (totals[transaction.category] ?? 0) + transaction.amount,
        }),
        {},
      ),
  ).sort((a, b) => b[1] - a[1]);
  const over = summary.budgets.filter((budget) => budget.spent > budget.limit);
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Your point of view"
        title="The signal behind the numbers."
        description="Explainable observations, grounded in your recorded activity."
      />
      <section className="surface p-7">
        <p className="eyebrow">
          {fy.label} · {displayDate(fy.start)} – {displayDate(fy.end)}
        </p>
        <h3 className="mt-3 text-xl font-semibold">
          Your Indian financial year
        </h3>
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          {Object.entries({
            Income: yearTotals.income,
            Expenses: yearTotals.expenses,
            "Net cash flow": yearTotals.saved,
          }).map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-[var(--ink-soft)]">{label}</dt>
              <dd className="mt-2 text-xl font-semibold tabular-nums">
                {money(value)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-[var(--ink-soft)]">
          Recorded transactions only. This is a cash-flow summary, not taxable
          income.
        </p>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1.2fr,.8fr]">
        <section className="rounded-3xl bg-[#101b16] p-8 text-white">
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#b8f2d0]">
            <ShieldCheck size={17} /> Financial health
          </p>
          <p className="mt-8 text-7xl font-semibold tracking-[-.08em]">
            {summary.score}
            <span className="text-3xl text-white/60">/100</span>
          </p>
          <h3 className="mt-6 text-xl font-semibold">
            {summary.score >= 75
              ? "A strong foundation."
              : "Clarity is the first step."}
          </h3>
          <p className="mt-3 max-w-lg text-sm leading-7 text-white/70">
            A simple planning indicator based on cash flow and budget coverage.
            This is not a credit score or financial advice.
          </p>
          <details className="mt-6 border-t border-white/15 pt-4 text-xs text-white/75">
            <summary className="cursor-pointer">
              How the score is calculated
            </summary>
            <p className="mt-3 leading-6">
              Start at 40. Add your savings rate, capped between −30 and +35
              points. Add 15 for having budgets and 10 for recording income.
              Subtract 8 for each over-budget category. The result is capped at
              0–100.
            </p>
          </details>
        </section>
        <section className="surface p-7">
          <Lightbulb className="text-[var(--mint-deep)]" size={24} />
          <h3 className="mt-6 text-xl font-semibold">Your next useful step</h3>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
            {over.length
              ? `${over.length} ${over.length === 1 ? "category is" : "categories are"} over budget. Review those transactions, then decide whether to reduce spending or revise the plan.`
              : summary.budgets.length
                ? "Your budgeted categories are within their limits. Review unplanned expenses before adding more to your goals."
                : "Create a few category budgets to turn your transactions into a spending plan."}
          </p>
          <Link
            href="/budgets"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--mint-deep)]"
          >
            Review the plan <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Cash-flow scenario</p>
              <h3 className="mt-3 text-xl font-semibold">
                What if this rhythm continues?
              </h3>
            </div>
            <TrendingUp size={22} className="text-[var(--cobalt)]" />
          </div>
          <div className="mt-7 flex gap-2">
            {[3, 6, 12].map((value) => (
              <button
                key={value}
                aria-pressed={horizon === value}
                onClick={() => setHorizon(value)}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold ${horizon === value ? "bg-[var(--ink)] text-[var(--surface)]" : "hover:bg-[var(--surface-muted)]"}`}
              >
                {value} months
              </button>
            ))}
          </div>
          <p className="mt-7 text-4xl font-semibold tracking-tight">
            {money(projected, state.locale)}
          </p>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            Illustrative future tracked balance
          </p>
          <div className="mt-7 rounded-xl bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--ink-soft)]">
            Current tracked balance + {horizon} × average monthly net cash flow
            ({money(monthlyNet, state.locale)}) from the previous three calendar
            months. Missing months count as zero. No investment returns,
            inflation, or future changes are modeled.
          </div>
        </section>
        <section className="surface p-7">
          <p className="eyebrow">Where it goes</p>
          <h3 className="mt-3 text-xl font-semibold">
            Your largest categories
          </h3>
          <div className="mt-7 space-y-5">
            {groups.length ? (
              groups.slice(0, 6).map(([category, amount]) => (
                <Link
                  href={`/transactions?category=${encodeURIComponent(category)}`}
                  key={category}
                  className="block"
                >
                  <div className="flex justify-between text-sm">
                    <span>{category}</span>
                    <span className="font-semibold">
                      {money(amount, state.locale)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(amount / summary.expenses) * 100}%`,
                        background: categoryColors[category],
                      }}
                    />
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[var(--ink-soft)]">
                Record an expense to see a category breakdown.
              </p>
            )}
          </div>
        </section>
      </div>
      <section className="surface p-7">
        <h3 className="text-lg font-semibold">A note on these insights</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
          These calculations run locally using the transactions and budgets you
          see in FinSight. They are deterministic and explainable; they do not
          use an AI service or claim to know how you use other apps.
        </p>
      </section>
    </div>
  );
}
