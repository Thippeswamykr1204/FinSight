"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  Gauge,
  Landmark,
  Plus,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import { useFinance } from "@/components/finance/provider";
import { Empty, PageHeading } from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { compactMoney, displayDate, region } from "@/lib/finance/region";
import {
  cashFlow,
  categoryColors,
  localDate,
  money,
  summarize,
} from "@/lib/finance/model";

const CashFlowChart = dynamic(
  () => import("@/components/finance/cash-flow-chart"),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="my-6 h-[255px] animate-pulse rounded-xl bg-white/5"
      >
        <span className="sr-only">Loading chart</span>
      </div>
    ),
  },
);

export default function DashboardPage() {
  const { state } = useFinance();
  const [months, setMonths] = useState(6);
  const summary = summarize(state);
  const history = cashFlow(state, months);
  const health =
    summary.score >= 75
      ? "Strong"
      : summary.score >= 50
        ? "Steady"
        : "Needs attention";
  const recent = [...state.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={new Intl.DateTimeFormat(state.locale, {
          month: "long",
          year: "numeric",
          timeZone: region.timeZone,
        }).format(new Date())}
        title="Your money, at a glance."
        description="A clear read on what changed and what comes next."
      >
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="print:hidden"
        >
          <Download size={14} className="mr-2" /> Print report
        </Button>
        <Button asChild>
          <Link href="/transactions?action=add">
            <Plus size={15} className="mr-2" /> Add money move
          </Link>
        </Button>
      </PageHeading>
      {!state.onboarded && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--mint-strong)]/40 bg-[var(--mint)]/35 p-4">
          <div>
            <p className="text-sm font-semibold">
              A little clarity starts here.
            </p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Explore sample data, then make this workspace yours.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="flex items-center gap-2 text-xs font-bold text-[var(--mint-deep)]"
          >
            Personalize your demo <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr),minmax(280px,.7fr)]">
        <section className="relative overflow-hidden rounded-3xl bg-[#101b16] p-6 text-white shadow-[var(--shadow-lg)] sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#167852] opacity-25 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/70">
                  <WalletCards size={16} /> Monthly cash flow
                </p>
                <p className="mt-5 text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-none tracking-[-.07em]">
                  <AnimatedNumber
                    value={summary.saved / 100}
                    prefix="₹"
                    decimals={2}
                  />
                </p>
                <p className="mt-4 text-xs text-white/65">
                  Income minus recorded expenses · {summary.savingRate}% savings
                  rate
                </p>
              </div>
              <div className="flex gap-2">
                {[
                  ["Income", summary.income],
                  ["Expenses", summary.expenses],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-white/60">
                      {label}
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      <span title={money(Number(value), state.locale)}>
                        {compactMoney(Number(value))}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Your cash flow pulse</h3>
                <p className="mt-1 text-xs text-white/65">
                  The rhythm behind your balance.
                </p>
              </div>
              <div className="flex rounded-xl border border-white/15 bg-white/5 p-1">
                {[3, 6, 12].map((value) => (
                  <button
                    key={value}
                    aria-pressed={months === value}
                    onClick={() => setMonths(value)}
                    className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${months === value ? "bg-[#b8f2d0] text-[#134f36]" : "text-white/70 hover:text-white"}`}
                  >
                    {value === 12 ? "1Y" : `${value}M`}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <CashFlowChart state={state} months={months} />
            </div>
            <div className="mt-3 flex gap-5 text-xs text-white/75">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-4 rounded-full bg-[#8fe8b6]" /> Income
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-4 rounded-full bg-[#e7a281]" />{" "}
                Expenses
              </span>
            </div>
            <details className="mt-5 border-t border-white/15 pt-3 text-xs text-white/75">
              <summary className="cursor-pointer">View chart data</summary>
              <table className="mt-3 w-full text-left">
                <thead>
                  <tr>
                    <th className="py-2">Month</th>
                    <th>Income</th>
                    <th>Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, index) => (
                    <tr key={index}>
                      <td className="py-1">{row.month}</td>
                      <td>{money(row.income * 100, state.locale)}</td>
                      <td>{money(row.expenses * 100, state.locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        </section>
        <section className="surface flex flex-col p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mint)] text-[var(--mint-deep)]">
              <Gauge size={20} />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Financial health</h3>
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Based on recorded activity
              </p>
            </div>
          </div>
          <div
            className="mx-auto mt-10 grid h-44 w-44 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#178457 0deg ${summary.score * 3.6}deg, var(--surface-muted) ${summary.score * 3.6}deg 360deg)`,
            }}
          >
            <div className="grid h-[144px] w-[144px] place-items-center rounded-full bg-[var(--surface)]">
              <div className="text-center">
                <p className="text-5xl font-semibold tracking-[-.07em]">
                  {summary.score}
                </p>
                <p className="mt-2 text-xs font-semibold text-[var(--mint-deep)]">
                  {health}
                </p>
              </div>
            </div>
          </div>
          <p className="my-7 text-center text-sm leading-6 text-[var(--ink-soft)]">
            {summary.saved >= 0
              ? "Your recorded income covers this month’s expenses. Keep an eye on the categories that matter."
              : "Expenses are ahead of income. Review your largest categories to find room to adjust."}
          </p>
          <Link
            href="/insights"
            className="mt-auto flex items-center justify-between border-t pt-5 text-xs font-semibold text-[var(--mint-deep)]"
          >
            Understand your score <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Tracked net worth",
            value: summary.balance,
            detail: `${state.accounts.length} manually tracked accounts`,
            icon: Landmark,
          },
          {
            title: "Goal savings",
            value: state.goals.reduce((sum, goal) => sum + goal.saved, 0),
            detail: "Earmarked savings, already included in balances",
            icon: Target,
          },
          {
            title: "Budget room",
            value: summary.remaining,
            detail: "Remaining in this month’s budgeted categories",
            icon: WalletCards,
          },
        ].map(({ title, value, detail, icon: Icon }) => (
          <section key={title} className="surface p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{title}</p>
              <Icon size={18} className="text-[var(--mint-deep)]" />
            </div>
            <p className="mt-6 text-3xl font-semibold tracking-tight">
              {money(value, state.locale)}
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--ink-soft)]">
              {detail}
            </p>
          </section>
        ))}
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.05fr,.95fr]">
        <section className="surface min-w-0 p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">This month</p>
              <h3 className="mt-2 text-lg font-semibold">Spending plan</h3>
            </div>
            <Link
              href="/budgets"
              className="text-xs font-semibold text-[var(--mint-deep)]"
            >
              View budgets ↗
            </Link>
          </div>
          <div className="mt-7 space-y-6">
            {summary.budgets.slice(0, 5).map((budget) => (
              <Link
                key={budget.id}
                href={`/transactions?category=${encodeURIComponent(budget.category)}`}
                className="group block"
              >
                <div className="mb-3 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium group-hover:underline">
                    {budget.category}
                  </span>
                  <span className="text-xs">
                    {money(budget.spent, state.locale)}{" "}
                    <span className="text-[var(--ink-soft)]">
                      / {money(budget.limit, state.locale)}
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (budget.spent / budget.limit) * 100)}%`,
                      background:
                        budget.spent > budget.limit
                          ? "var(--danger)"
                          : categoryColors[budget.category],
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
          {!summary.budgets.length && (
            <Empty
              title="Make a plan for this month"
              description="Set a budget to see your spending in context."
            >
              <Link href="/budgets" className="text-[var(--mint-deep)]">
                Set a budget →
              </Link>
            </Empty>
          )}
        </section>
        <section className="surface min-w-0 p-6 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Money moves</p>
              <h3 className="mt-2 text-lg font-semibold">
                Recent transactions
              </h3>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-[var(--mint-deep)]"
            >
              See all ↗
            </Link>
          </div>
          <div className="mt-5 divide-y">
            {recent.map((transaction) => (
              <Link
                href={`/transactions?category=${encodeURIComponent(transaction.category)}`}
                key={transaction.id}
                className="group flex items-center gap-3 py-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)] text-xs font-semibold">
                  {transaction.merchant.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium group-hover:underline">
                    {transaction.merchant}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--ink-soft)]">
                    {transaction.category}
                  </span>
                </span>
                <span
                  className={`text-sm font-semibold ${transaction.type === "income" ? "text-[var(--mint-deep)]" : ""}`}
                >
                  {transaction.type === "income" ? "+" : "−"}
                  {money(transaction.amount, state.locale)}
                </span>
              </Link>
            ))}
          </div>
          {!recent.length && (
            <Empty
              title="Your first money move"
              description="Add a transaction or import a statement to begin."
            />
          )}
          <Link
            href="/transactions?action=add"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-xs font-semibold text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]"
          >
            <Plus size={14} /> Add a money move
          </Link>
        </section>
      </div>
      <div className="flex items-start gap-3 rounded-2xl border bg-[var(--mint)]/35 p-5">
        <Sparkles size={20} className="shrink-0 text-[var(--mint-deep)]" />
        <div>
          <h3 className="text-sm font-semibold">One useful signal</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
            {summary.saved > 0
              ? `${money(summary.saved, state.locale)} of recorded income remains after expenses this month. Upcoming bills and unrecorded purchases can change that picture.`
              : "Start by reviewing income and essential expenses. A complete picture makes the next decision easier."}
          </p>
        </div>
        <Link
          href="/insights"
          aria-label="Explore this insight"
          className="ml-auto rounded-lg p-2 hover:bg-[var(--surface)]"
        >
          <ArrowUpRight size={18} />
        </Link>
      </div>
      <p className="text-xs text-[var(--ink-soft)]">
        Demo workspace · INR · Report date {displayDate(localDate())} · Figures
        reflect browser-local records.
      </p>
    </div>
  );
}
