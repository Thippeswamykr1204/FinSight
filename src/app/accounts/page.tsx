"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Landmark, Plus, Upload } from "lucide-react";
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
  accountBalance,
  accountSchema,
  accountTypes,
  money,
  summarize,
  toPaise,
} from "@/lib/finance/model";
import { displayDate } from "@/lib/finance/region";

export default function AccountsPage() {
  const { state, update, notice } = useFinance();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const summary = summarize(state);
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const raw = String(data.get("balance"));
      const balance =
        raw === "0" || raw === "0.00"
          ? 0
          : toPaise(raw.replace(/^-/, "")) * (raw.startsWith("-") ? -1 : 1);
      const account = accountSchema.parse({
        id: crypto.randomUUID(),
        name: data.get("name"),
        type: data.get("type"),
        openingBalance: balance,
        dueDate: data.get("dueDate") || null,
      });
      update((current) => ({
        ...current,
        accounts: [...current.accounts, account],
      }));
      setOpen(false);
      notice("Manual account added.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Check your account details.",
      );
    }
  }
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Your financial world"
        title="A place for every account."
        description="Track cash, credit, and investments together. Demo accounts are manually maintained."
      >
        <Button
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          <Plus size={15} className="mr-2" /> Add account
        </Button>
      </PageHeading>
      <FormError error={error} />
      <section className="rounded-3xl bg-[#101b16] p-8 text-white">
        <p className="eyebrow text-white/65">Tracked net worth</p>
        <p className="mt-5 break-words text-[clamp(1.7rem,5vw,3rem)] font-semibold tracking-tight tabular-nums">
          {money(summary.balance, state.locale)}
        </p>
        <p className="mt-4 text-sm text-white/65">
          Opening balances + all recorded income − all recorded expenses
        </p>
      </section>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {state.accounts.map((account, index) => (
          <article key={account.id} className="surface surface-hover p-6">
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--mint-deep)]">
                <Landmark size={21} />
              </span>
              <span className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-soft)]">
                {account.type}
              </span>
            </div>
            <h3 className="mt-6 text-lg font-semibold">{account.name}</h3>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Manual account · INR
            </p>
            {account.dueDate && (
              <p className="mt-3 text-xs text-[var(--ember)]">
                Payment due {displayDate(account.dueDate)} · manual reminder
              </p>
            )}
            {["Credit Card", "Credit"].includes(account.type) && (
              <div className="mt-4 space-y-2">
                <label className="block text-xs">
                  Update payment reminder
                  <input
                    aria-label={`Payment due for ${account.name}`}
                    type="date"
                    value={account.dueDate ?? ""}
                    className="control mt-2 w-full px-3"
                    onChange={(event) => {
                      const dueDate = event.target.value || null;
                      try {
                        update((current) => ({
                          ...current,
                          accounts: current.accounts.map((item) =>
                            item.id === account.id
                              ? { ...item, dueDate }
                              : item,
                          ),
                        }));
                        notice("Payment reminder updated.");
                      } catch (caught) {
                        setError(String(caught));
                      }
                    }}
                  />
                </label>
                {account.dueDate && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      update((current) => ({
                        ...current,
                        accounts: current.accounts.map((item) =>
                          item.id === account.id
                            ? { ...item, dueDate: null }
                            : item,
                        ),
                      }))
                    }
                  >
                    Clear reminder after payment
                  </Button>
                )}
              </div>
            )}
            <p className="mt-7 text-3xl font-semibold tracking-tight">
              {money(accountBalance(state, account.id), state.locale)}
            </p>
            <div
              className="mt-6 h-1 rounded-full"
              style={{
                background: ["#178457", "#4c6fff", "#be603a"][index % 3],
              }}
            />
            <p className="mt-4 text-xs text-[var(--ink-soft)]">
              {
                state.transactions.filter(
                  (transaction) => transaction.accountId === account.id,
                ).length
              }{" "}
              recorded transactions
            </p>
          </article>
        ))}
      </div>
      {!state.accounts.length && (
        <section className="surface">
          <Empty
            title="Start with one account"
            description="Add an opening balance, then record or import the money that moves through it."
          >
            <Button onClick={() => setOpen(true)}>
              Add your first account
            </Button>
          </Empty>
        </section>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <section className="surface p-7">
          <Upload className="text-[var(--cobalt)]" size={22} />
          <h3 className="mt-5 text-lg font-semibold">Bring your statement.</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            Import CSV or OFX files, inspect the preview, and skip duplicates.
            Your statement stays in this browser.
          </p>
          <Link
            href="/transactions?action=import"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--mint-deep)]"
          >
            Import transactions <ArrowUpRight size={16} />
          </Link>
        </section>
        <section className="surface p-7">
          <Landmark size={22} className="text-[var(--mint-deep)]" />
          <h3 className="mt-5 text-lg font-semibold">Bank connections</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            Live bank syncing is not enabled in this demo. Manual accounts and
            statement imports let you explore the complete tracking workflow
            without sharing bank credentials.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => setOpen(true)}
          >
            Use a manual account
          </Button>
        </section>
      </div>
      <FinanceDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add a manual account"
        description="Choose a starting balance before the transactions you plan to record."
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="Account name">
            <input
              required
              maxLength={80}
              name="name"
              className="control px-3"
            />
          </Field>
          <Field label="Account type">
            <select name="type" className="control px-3">
              {accountTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Next payment due date (optional; credit cards)">
            <input type="date" name="dueDate" className="control px-3" />
          </Field>
          <Field label="Opening balance (INR; use a negative amount for debt)">
            <input
              required
              name="balance"
              defaultValue="0.00"
              inputMode="decimal"
              className="control px-3"
            />
          </Field>
          <FormError error={error} />
          <Button className="w-full">Add account</Button>
        </form>
      </FinanceDialog>
    </div>
  );
}
