"use client";
import { displayDate } from "@finsight/shared";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
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
  categories,
  categoryColors,
  localDate,
  money,
  summarize,
  toPaise,
  transactionSchema,
  type Transaction,
} from "@finsight/shared";
import {
  download,
  exportCsv,
  parseStatement,
  uniqueImports,
} from "@finsight/shared";

function Transactions() {
  const { state, command, notice, role } = useFinance();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<Omit<Transaction, "id">[]>([]);
  const [error, setError] = useState("");
  const [importAccount, setImportAccount] = useState(
    state.accounts[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setOpen(params.get("action") === "add");
    setImportOpen(params.get("action") === "import");
    if (params.get("category")) setCategory(params.get("category")!);
  }, [params]);
  const filtered = useMemo(
    () =>
      state.transactions
        .filter(
          (transaction) =>
            (type === "All" || transaction.type === type) &&
            (category === "All" || transaction.category === category) &&
            `${transaction.merchant} ${transaction.note}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.transactions, type, category, query],
  );
  const summary = summarize(state);
  const visible = filtered.slice((page - 1) * 12, page * 12);
  const unique = uniqueImports(state.transactions, preview);
  function filter(change: () => void) {
    change();
    setPage(1);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const transaction = transactionSchema.parse({
        id: editing?.id ?? crypto.randomUUID(),
        merchant: form.get("merchant"),
        amount: toPaise(String(form.get("amount"))),
        date: form.get("date"),
        type: form.get("type"),
        category: form.get("category"),
        accountId: form.get("account"),
        note: form.get("note"),
      });
      const { id: _id, version: _version, ...data } = transaction;
      await command(
        editing
          ? {
              action: "transaction.update",
              id: editing.id,
              version: editing.version ?? 1,
              data,
            }
          : { action: "transaction.create", data },
      );
      setOpen(false);
      setEditing(null);
      notice(editing ? "Transaction updated." : "Transaction saved.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Check the transaction fields.",
      );
    }
  }
  async function readFile(file?: File) {
    setError("");
    setPreview([]);
    if (!file) return;
    if (file.size > 2_000_000) {
      setError("Choose a file under 2 MB.");
      return;
    }
    setBusy(true);
    try {
      setPreview(
        parseStatement(
          await file.text(),
          file.name,
          importAccount || state.accounts[0]?.id || "",
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not read the statement.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Money in motion"
        title="Every move, in perspective."
        description="Search your history, review a detail, or add what is missing."
      >
        <Button
          variant="outline"
          disabled={role === "VIEWER"}
          onClick={() => {
            setError("");
            setPreview([]);
            setImportOpen(true);
          }}
        >
          <Upload size={15} className="mr-2" /> Import
        </Button>
        <Button
          disabled={role === "VIEWER"}
          onClick={() => {
            setEditing(null);
            setError("");
            setOpen(true);
          }}
        >
          <Plus size={15} className="mr-2" /> Add transaction
        </Button>
      </PageHeading>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Income this month", summary.income],
          ["Spent this month", summary.expenses],
          ["Net cash flow", summary.saved],
        ].map(([label, value]) => (
          <div key={label} className="surface p-5">
            <p className="eyebrow">{label}</p>
            <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
              {money(Number(value), state.locale)}
            </p>
          </div>
        ))}
      </div>
      <section className="surface overflow-hidden">
        <div className="flex flex-col flex-wrap gap-3 border-b p-4 sm:flex-row sm:items-center sm:p-6">
          <div className="flex rounded-xl bg-[var(--surface-muted)] p-1">
            {["All", "income", "expense"].map((value) => (
              <button
                key={value}
                onClick={() => filter(() => setType(value))}
                aria-pressed={type === value}
                className={`rounded-lg px-4 py-2 text-xs font-semibold ${type === value ? "bg-[var(--surface)] shadow-sm" : "text-[var(--ink-soft)]"}`}
              >
                {value === "All"
                  ? "All activity"
                  : value === "income"
                    ? "Income"
                    : "Expenses"}
              </button>
            ))}
          </div>
          <label className="relative sm:ml-auto">
            <span className="sr-only">Search transactions</span>
            <Search
              size={16}
              className="absolute left-3 top-3.5 text-[var(--ink-muted)]"
            />
            <input
              value={query}
              onChange={(event) => filter(() => setQuery(event.target.value))}
              className="control w-full pl-9 pr-3 text-sm"
              placeholder="Search transactions"
            />
          </label>
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(event) => filter(() => setCategory(event.target.value))}
            className="control px-3 text-sm"
          >
            <option value="All">All categories</option>
            {categories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm sm:table-auto">
            <thead className="bg-[var(--surface-raised)] text-xs text-[var(--ink-soft)]">
              <tr>
                <th className="px-5 py-3 font-medium">Transaction</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Category
                </th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Date
                </th>
                <th className="w-[130px] px-2 py-3 text-right font-medium sm:w-auto sm:px-4">
                  Amount
                </th>
                <th className="w-11 px-2 py-3 sm:w-auto sm:px-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-t hover:bg-[var(--surface-raised)]"
                >
                  <td className="max-w-[230px] px-3 py-4 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)] text-xs font-bold sm:grid">
                        {transaction.merchant.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <button
                          onClick={() => {
                            setEditing(transaction);
                            setError("");
                            setOpen(true);
                          }}
                          className="block max-w-full break-words text-left font-semibold hover:text-[var(--mint-deep)] sm:truncate"
                        >
                          {transaction.merchant}
                        </button>
                        <p className="mt-1 truncate text-xs text-[var(--ink-soft)]">
                          {
                            state.accounts.find(
                              (account) => account.id === transaction.accountId,
                            )?.name
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-4 md:table-cell">
                    <span
                      className="mr-2 inline-block h-1.5 w-1.5 rounded-full"
                      style={{
                        background: categoryColors[transaction.category],
                      }}
                    />
                    {transaction.category}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-xs text-[var(--ink-soft)] sm:table-cell">
                    {displayDate(transaction.date)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-2 py-4 text-right font-semibold tabular-nums sm:px-4 ${transaction.type === "income" ? "text-[var(--mint-deep)]" : ""}`}
                  >
                    {transaction.type === "income" ? "+" : "−"}
                    {money(transaction.amount, state.locale)}
                  </td>
                  <td className="px-2 py-3">
                    <button
                      aria-label={`Delete ${transaction.merchant}`}
                      onClick={() => setDeleting(transaction)}
                      className="rounded-lg p-2 text-[var(--ink-soft)] hover:bg-red-100/50 hover:text-[var(--danger)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            title="No matching money moves"
            description="Try a different search or add your first transaction."
          >
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setCategory("All");
                setType("All");
              }}
            >
              Clear filters
            </Button>
          </Empty>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-5 text-xs text-[var(--ink-soft)]">
          <span>
            {filtered.length} transactions · page {page} of{" "}
            {Math.max(1, Math.ceil(filtered.length / 12))}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page * 12 >= filtered.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                download(
                  exportCsv(filtered),
                  "finsight-transactions.csv",
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download size={14} className="mr-2" /> Export CSV
            </Button>
          </div>
        </div>
      </section>
      <FinanceDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit transaction" : "Add a transaction"}
        description="Changes are saved to your workspace. Amounts are rupees, stored as integer paise."
      >
        {!state.accounts.length ? (
          <Empty
            title="Add an account first"
            description="An account keeps your balances and money movements together."
          >
            <a href="/accounts" className="text-[var(--mint-deep)]">
              Go to accounts →
            </a>
          </Empty>
        ) : (
          <form
            key={editing?.id ?? "new"}
            onSubmit={save}
            className="space-y-4"
          >
            <Field label="Merchant or source">
              <input
                required
                maxLength={120}
                name="merchant"
                defaultValue={editing?.merchant}
                className="control px-3"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount (INR)">
                <input
                  name="amount"
                  required
                  inputMode="decimal"
                  defaultValue={
                    editing ? (editing.amount / 100).toFixed(2) : ""
                  }
                  className="control px-3"
                />
              </Field>
              <Field label="Type">
                <select
                  name="type"
                  defaultValue={editing?.type ?? "expense"}
                  className="control px-3"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date">
                <input
                  required
                  type="date"
                  name="date"
                  defaultValue={editing?.date ?? localDate()}
                  className="control min-w-0 px-3"
                />
              </Field>
              <Field label="Category">
                <select
                  name="category"
                  defaultValue={editing?.category ?? "Food & dining"}
                  className="control px-3"
                >
                  {categories.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Account">
              <select
                name="account"
                defaultValue={editing?.accountId ?? state.accounts[0]?.id}
                className="control px-3"
              >
                {state.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Note (optional)">
              <input
                name="note"
                maxLength={500}
                defaultValue={editing?.note}
                className="control px-3"
              />
            </Field>
            <FormError error={error} />
            <Button type="submit" className="h-11 w-full">
              <Pencil size={14} className="mr-2" /> Save transaction
            </Button>
          </form>
        )}
      </FinanceDialog>
      <FinanceDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete transaction?"
        description={`Remove ${deleting?.merchant ?? "this transaction"} and recalculate your balances.`}
      >
        <FormError error={error} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Keep transaction
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              try {
                if (!deleting) return;
                await command({
                  action: "transaction.delete",
                  id: deleting.id,
                  version: deleting.version ?? 1,
                });
                setDeleting(null);
                setPage(1);
                notice("Transaction deleted.");
              } catch (caught) {
                setError(String(caught));
              }
            }}
          >
            Delete transaction
          </Button>
        </div>
      </FinanceDialog>
      <FinanceDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import a statement"
        description="Preview CSV or OFX transactions before saving. Duplicate rows are skipped."
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs leading-6">
            CSV columns: <code>date,merchant,amount,type,category</code>
            <br />
            Dates: DD/MM/YYYY or YYYY-MM-DD. Amounts are INR rupees (123.45 or
            quoted Indian commas). Include a currency column to identify the
            statement currency.
          </p>
          <Field label="Destination account">
            <select
              value={importAccount || state.accounts[0]?.id || ""}
              onChange={(event) => {
                setImportAccount(event.target.value);
                setPreview([]);
              }}
              className="control px-3"
            >
              {state.accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statement file (up to 2 MB)">
            <input
              disabled={!state.accounts.length || busy}
              type="file"
              accept=".csv,.ofx"
              onChange={(event) => void readFile(event.target.files?.[0])}
              className="control max-w-full p-3 text-xs"
            />
          </Field>
          <Button
            variant="link"
            size="sm"
            onClick={() =>
              download(
                "date,merchant,amount,type,category,currency\n",
                "finsight-import-template.csv",
                "text/csv",
              )
            }
          >
            Download CSV template
          </Button>
          {busy && <p role="status">Reading statement…</p>}
          <FormError error={error} />
          {!!preview.length && (
            <div className="rounded-xl border p-3 text-xs">
              <p className="mb-3 font-semibold">
                {unique.length} new · {preview.length - unique.length}{" "}
                duplicates skipped
              </p>
              <div className="max-h-40 overflow-y-auto">
                {preview.slice(0, 30).map((row, index) => (
                  <p
                    key={index}
                    className="flex justify-between gap-3 border-t py-2"
                  >
                    <span>
                      {displayDate(row.date)} · {row.merchant}
                    </span>
                    <span>{money(row.amount)}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
          <Button
            disabled={!unique.length || busy}
            className="w-full"
            onClick={async () => {
              try {
                await command({
                  action: "transaction.import",
                  rows: unique.map(({ version: _version, ...row }) => row),
                });
                setImportOpen(false);
                notice(`${unique.length} transactions imported.`);
                setPreview([]);
              } catch (caught) {
                setError(String(caught));
              }
            }}
          >
            Import {unique.length || ""} transactions
          </Button>
        </div>
      </FinanceDialog>
    </div>
  );
}
export default function TransactionsPage() {
  return (
    <Suspense fallback={<p>Loading transactions…</p>}>
      <Transactions />
    </Suspense>
  );
}
