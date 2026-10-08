"use client";
import { displayDate } from "@finsight/shared";

import { useState } from "react";
import { ArrowRight, Plus, Target } from "lucide-react";
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
  goalSchema,
  localDate,
  money,
  toPaise,
  seasonalGoals,
  type Goal,
} from "@finsight/shared";

export default function GoalsPage() {
  const { state, command, notice, role } = useFinance();
  const [open, setOpen] = useState(false);
  const [funding, setFunding] = useState<Goal | null>(null);
  const [error, setError] = useState("");
  const saved = state.goals.reduce((sum, goal) => sum + goal.saved, 0);
  const target = state.goals.reduce((sum, goal) => sum + goal.target, 0);
  const percent = target ? Math.round((saved / target) * 100) : 0;
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    try {
      const goal = goalSchema.parse({
        id: crypto.randomUUID(),
        name: data.get("name"),
        target: toPaise(String(data.get("target"))),
        saved: 0,
        due: data.get("due"),
      });
      const { id: _id, saved: _saved, ...payload } = goal;
      await command({ action: "goal.create", data: payload });
      setOpen(false);
      notice("Goal created. Your next chapter has a name.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check your goal.");
    }
  }
  async function fund(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!funding) return;
    try {
      const amount = toPaise(
        String(new FormData(event.currentTarget).get("amount")),
      );
      if (amount > funding.target - funding.saved)
        throw new Error("Contribution exceeds the remaining target.");
      await command({ action: "goal.contribute", id: funding.id, amount });
      setFunding(null);
      notice(
        funding.saved + amount === funding.target
          ? "Goal reached. Take a moment to celebrate!"
          : "Contribution recorded. A little closer.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check the amount.");
    }
  }
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Future you"
        title="Somewhere worth going."
        description="Turn an intention into a plan you can see growing."
      >
        <Button
          disabled={role === "VIEWER"}
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          <Plus size={15} className="mr-2" /> New goal
        </Button>
      </PageHeading>
      <section className="rounded-3xl bg-[#101b16] p-7 text-white sm:p-9">
        <p className="eyebrow text-[#b8f2d0]">Your bigger picture</p>
        <p className="mt-5 text-4xl font-semibold tracking-tight">
          {money(saved, state.locale)}
        </p>
        <p className="mt-3 text-sm text-white/70">
          recorded toward {money(target, state.locale)} across{" "}
          {state.goals.length} goals
        </p>
        <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-[#54d99a]"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-white/70">
          {percent}% of your goal plan
        </p>
      </section>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {state.goals.map((goal, index) => {
          const progress = Math.round((goal.saved / goal.target) * 100);
          return (
            <article key={goal.id} className="surface surface-hover p-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--mint-deep)]">
                <Target size={22} />
              </span>
              <h3 className="mt-6 text-lg font-semibold">{goal.name}</h3>
              <p className="mt-2 text-xs text-[var(--ink-soft)]">
                Target date · {displayDate(goal.due)}
              </p>
              <div className="mt-8 flex justify-between gap-3">
                <p className="text-2xl font-semibold tracking-tight">
                  {money(goal.saved, state.locale)}
                </p>
                <p className="self-end text-xs text-[var(--ink-soft)]">
                  {progress}%
                </p>
              </div>
              <div
                role="progressbar"
                aria-label={goal.name}
                aria-valuenow={Math.min(progress, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                    background: ["#178457", "#4c6fff", "#be603a"][index % 3],
                  }}
                />
              </div>
              <p className="mt-3 text-xs text-[var(--ink-soft)]">
                {money(Math.max(0, goal.target - goal.saved), state.locale)} to
                go · {money(goal.target, state.locale)} target
              </p>
              <Button
                variant="outline"
                disabled={goal.saved >= goal.target}
                className="mt-6 w-full"
                onClick={() => {
                  setError("");
                  setFunding(goal);
                }}
              >
                {goal.saved >= goal.target
                  ? "Goal reached ✓"
                  : "Record contribution"}
                <ArrowRight size={14} className="ml-2" />
              </Button>
            </article>
          );
        })}
      </div>
      {!state.goals.length && (
        <section className="surface">
          <Empty
            title="What are you working toward?"
            description="Start with a rainy-day fund, a trip, or something entirely yours."
          >
            <Button onClick={() => setOpen(true)}>Create a goal</Button>
          </Empty>
        </section>
      )}
      <p className="text-xs leading-6 text-[var(--ink-soft)]">
        Goal contributions track earmarked savings. They do not transfer money,
        change account balances, or add to net worth.
      </p>
      <FinanceDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create a goal"
        description="Pick a destination and a target date. You can begin with a small contribution."
      >
        <form onSubmit={create} className="space-y-4">
          <Field label="Goal name">
            <input
              required
              name="name"
              list="seasonal-goals"
              maxLength={80}
              className="control px-3"
            />
            <datalist id="seasonal-goals">
              {seasonalGoals.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
          <Field label="Target amount (INR)">
            <input
              required
              name="target"
              inputMode="decimal"
              className="control px-3"
            />
          </Field>
          <Field label="Target date">
            <input
              required
              type="date"
              name="due"
              min={localDate()}
              className="control px-3"
            />
          </Field>
          <FormError error={error} />
          <Button className="w-full">Create goal</Button>
        </form>
      </FinanceDialog>
      <FinanceDialog
        open={!!funding}
        onClose={() => setFunding(null)}
        title={`Contribute to ${funding?.name ?? "your goal"}`}
        description="Record savings you have already set aside. No money is transferred."
      >
        <form onSubmit={fund} className="space-y-4">
          <Field label="Contribution (INR)">
            <input
              required
              name="amount"
              inputMode="decimal"
              className="control px-3"
            />
          </Field>
          <FormError error={error} />
          <Button className="w-full">Record contribution</Button>
        </form>
      </FinanceDialog>
    </div>
  );
}
