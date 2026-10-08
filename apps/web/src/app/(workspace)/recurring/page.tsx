"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useFinance } from "@/components/finance/provider";
import {
  Empty,
  Field,
  FinanceDialog,
  FormError,
  PageHeading,
} from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/hosted/client";
import {
  categories,
  displayDate,
  localDate,
  money,
  toPaise,
} from "@finsight/shared";
type Rule = {
  id: string;
  transaction: { merchant: string; amount: number };
  frequency: string;
  nextDue: string;
  enabled: boolean;
};
export default function RecurringPage() {
  const { workspace, state, role, notice } = useFinance();
  const [rules, setRules] = useState<Rule[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<{ payload: string; key: string } | null>(null);
  const load = useCallback(async () => {
    if (workspace)
      try {
        setRules(await api<Rule[]>(`/workspaces/${workspace.id}/recurring`));
        setError("");
      } catch (caught) {
        setError(String(caught));
      }
  }, [workspace]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Your regular rhythm"
        title="Recurring transactions."
        description="Record regular income or expenses on their scheduled dates."
      >
        <Button
          disabled={!workspace || !state.accounts.length || role === "VIEWER"}
          onClick={() => setOpen(true)}
        >
          <Plus size={15} className="mr-2" /> Add recurring transaction
        </Button>
      </PageHeading>
      <FormError error={error} />
      <section className="surface p-7">
        {rules.length ? (
          <div className="space-y-4">
            {rules.map((rule) => (
              <article key={rule.id} className="rounded-xl border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {rule.transaction.merchant}
                    </h3>
                    <p className="mt-2 text-xs text-[var(--ink-soft)]">
                      {rule.frequency} · {money(rule.transaction.amount)} · next{" "}
                      {displayDate(rule.nextDue)} ·{" "}
                      {rule.enabled ? "active" : "paused"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={role === "VIEWER"}
                      onClick={async () => {
                        try {
                          await api(
                            `/workspaces/${workspace?.id}/recurring/${rule.id}`,
                            {
                              method: "PATCH",
                              body: { enabled: !rule.enabled },
                            },
                          );
                          await load();
                        } catch (caught) {
                          setError(String(caught));
                        }
                      }}
                    >
                      {rule.enabled ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={role === "VIEWER"}
                      onClick={async () => {
                        try {
                          await api(
                            `/workspaces/${workspace?.id}/recurring/${rule.id}`,
                            { method: "DELETE" },
                          );
                          await load();
                        } catch (caught) {
                          setError(String(caught));
                        }
                      }}
                    >
                      Remove rule
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Make regular moves easier"
            description="Add an account, then schedule a recurring transaction. Each scheduled occurrence is recorded once."
          />
        )}
      </section>
      <FinanceDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add a recurring transaction"
        description="Monthly and yearly schedules keep the original day, clamped to the last day of shorter months."
      >
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const field = (name: string) => String(form.get(name) ?? "");
            setError("");
            setBusy(true);
            try {
              const body = {
                transaction: {
                  merchant: field("merchant"),
                  amount: toPaise(field("amount")),
                  date: field("date"),
                  type: field("type"),
                  category: field("category"),
                  accountId: field("accountId"),
                  note: field("note"),
                },
                nextDue: field("date"),
                frequency: field("frequency"),
                endDate: field("endDate") || null,
              };
              const payload = JSON.stringify(body);
              if (pending.current?.payload !== payload)
                pending.current = { payload, key: crypto.randomUUID() };
              await api(`/workspaces/${workspace?.id}/recurring`, {
                method: "POST",
                body,
                key: pending.current.key,
              });
              pending.current = null;
              setOpen(false);
              await load();
              notice("Recurring transaction saved.");
            } catch (caught) {
              setError(String(caught));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Merchant or source">
            <input
              name="merchant"
              required
              maxLength={120}
              className="control px-3"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (INR)">
              <input
                name="amount"
                required
                inputMode="decimal"
                className="control px-3"
              />
            </Field>
            <Field label="Type">
              <select name="type" className="control px-3">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </Field>
          </div>
          <Field label="Account">
            <select name="accountId" className="control px-3">
              {state.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select name="category" className="control px-3">
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First date">
              <input
                name="date"
                type="date"
                defaultValue={localDate()}
                required
                className="control min-w-0 px-3"
              />
            </Field>
            <Field label="Frequency">
              <select
                name="frequency"
                defaultValue="monthly"
                className="control px-3"
              >
                {["daily", "weekly", "monthly", "yearly"].map((frequency) => (
                  <option key={frequency}>{frequency}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="End date (optional)">
            <input name="endDate" type="date" className="control px-3" />
          </Field>
          <Field label="Note (optional)">
            <input name="note" maxLength={500} className="control px-3" />
          </Field>
          <FormError error={error} />
          <Button type="submit" loading={busy} className="w-full">
            Save recurring transaction
          </Button>
        </form>
      </FinanceDialog>
    </div>
  );
}
