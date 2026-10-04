"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Download,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  Users,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  Field,
  FinanceDialog,
  FormError,
  PageHeading,
} from "@/components/finance/primitives";
import { api } from "@/lib/hosted/client";
import type {
  FinanceCommand,
  HostedEntry,
  HostedGoal,
  Overview,
} from "@/lib/hosted/contracts";
import {
  categories,
  categoryColors,
  localDate,
  money,
  toCents,
  type Transaction,
} from "@/lib/finance/model";
import {
  download,
  exportCsv,
  parseStatement,
} from "@/lib/finance/import-export";

type View =
  "Overview" | "Transactions" | "Accounts" | "Budgets" | "Goals" | "Members";
type Editor =
  | "account"
  | "transaction"
  | "budget"
  | "goal"
  | "contribution"
  | "import"
  | "invite"
  | null;
const signedCents = (raw: string) =>
  /^(0|0\.0{1,2})$/.test(raw)
    ? 0
    : toCents(raw.replace(/^-/, "")) * (raw.startsWith("-") ? -1 : 1);

export function WorkspaceBoard({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [entries, setEntries] = useState<HostedEntry[]>([]);
  const [view, setView] = useState<View>("Overview");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editor, setEditor] = useState<Editor>(null);
  const [editing, setEditing] = useState<HostedEntry | null>(null);
  const [funding, setFunding] = useState<HostedGoal | null>(null);
  const [deleting, setDeleting] = useState<HostedEntry | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [importAccount, setImportAccount] = useState("");
  const [preview, setPreview] = useState<Omit<Transaction, "id">[]>([]);
  const pending = useRef<{ payload: string; key: string } | null>(null);
  const base = `/workspaces/${workspaceId}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    const params = new URLSearchParams({ limit: "25", search: query });
    if (cursor) params.set("cursor", cursor);
    Promise.all([
      api<Overview>(`${base}/overview`),
      api<{ items: HostedEntry[]; nextCursor: string | null }>(
        `${base}/transactions?${params}`,
      ),
    ])
      .then(([overview, page]) => {
        if (!active) return;
        setData(overview);
        setEntries(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch((caught) => {
        if (active)
          setLoadError(
            caught instanceof Error
              ? caught.message
              : "Unable to load the workspace.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [base, revision, query, cursor]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const canWrite = data?.role !== "VIEWER";
  const canManage = data && ["OWNER", "ADMIN"].includes(data.role);
  function open(kind: Editor) {
    setEditor(kind);
    setError("");
    setEditing(null);
    setFunding(null);
    setPreview([]);
  }
  async function command(command: FinanceCommand) {
    const payload = JSON.stringify(command);
    if (pending.current?.payload !== payload)
      pending.current = { payload, key: crypto.randomUUID() };
    const result = await api<Record<string, unknown>>(`${base}/commands`, {
      method: "POST",
      body: command,
      key: pending.current.key,
    });
    pending.current = null;
    refresh();
    return result;
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const field = (key: string) => String(form.get(key) ?? "");
    try {
      if (editor === "account")
        await command({
          action: "account.create",
          data: {
            name: field("name"),
            type: field("type") as "Cash" | "Credit" | "Investments",
            openingBalance: signedCents(field("balance")),
          },
        });
      if (editor === "transaction") {
        const entry = {
          merchant: field("merchant"),
          amount: toCents(field("amount")),
          date: field("date"),
          type: field("type") as "income" | "expense",
          category: field("category") as (typeof categories)[number],
          accountId: field("accountId"),
          note: field("note"),
        };
        await command(
          editing
            ? {
                action: "transaction.update",
                id: editing.id,
                version: editing.version,
                data: entry,
              }
            : { action: "transaction.create", data: entry },
        );
      }
      if (editor === "budget")
        await command({
          action: "budget.set",
          data: {
            category: field("category") as Exclude<
              (typeof categories)[number],
              "Income"
            >,
            month: localDate().slice(0, 7),
            limit: toCents(field("amount")),
          },
        });
      if (editor === "goal")
        await command({
          action: "goal.create",
          data: {
            name: field("name"),
            target: toCents(field("amount")),
            due: field("due"),
          },
        });
      if (editor === "contribution" && funding)
        await command({
          action: "goal.contribute",
          id: funding.id,
          amount: toCents(field("amount")),
        });
      if (editor === "invite") {
        await api(`${base}/members`, {
          method: "POST",
          body: { email: field("email"), role: field("role") },
        });
        refresh();
      }
      setNotice(
        editor === "invite"
          ? "Invitation queued for email delivery."
          : "Saved to your workspace.",
      );
      setEditor(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      await command({
        action: "transaction.delete",
        id: deleting.id,
        version: deleting.version,
      });
      setDeleting(null);
      setNotice("Transaction deleted.");
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  }
  async function readFile(file?: File) {
    setError("");
    setPreview([]);
    if (!file) return;
    if (file.size > 2_000_000) {
      setError("Choose a statement smaller than 2 MB.");
      return;
    }
    try {
      setPreview(
        parseStatement(
          await file.text(),
          file.name,
          importAccount || data?.accounts[0]?.id || "",
        ),
      );
    } catch (caught) {
      setError(String(caught));
    }
  }
  async function importRows() {
    setBusy(true);
    setError("");
    try {
      const result = await command({
        action: "transaction.import",
        rows: preview,
      });
      setNotice(
        `${result.imported} imported · ${result.duplicates} duplicates skipped.`,
      );
      setEditor(null);
    } catch (caught) {
      setError(String(caught));
    } finally {
      setBusy(false);
    }
  }
  async function exportWorkspace() {
    setBusy(true);
    try {
      const result = await api(`${base}/export`);
      download(
        JSON.stringify(result, null, 2),
        "finsight-hosted-workspace.json",
        "application/json",
      );
      setNotice("Workspace export downloaded.");
    } catch (caught) {
      setLoadError(String(caught));
    } finally {
      setBusy(false);
    }
  }
  async function memberRole(userId: string, role: string) {
    setBusy(true);
    try {
      await api(`${base}/members`, { method: "PATCH", body: { userId, role } });
      refresh();
      setNotice("Member role updated.");
    } catch (caught) {
      setLoadError(String(caught));
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <section className="surface p-10">
        {loadError ? (
          <>
            <FormError error={loadError} />
            <Button onClick={refresh} className="mt-5">
              Try again
            </Button>
          </>
        ) : (
          <div role="status" className="animate-pulse space-y-5">
            <p>Loading your private workspace…</p>
            <div className="h-64 rounded-2xl bg-[var(--surface-muted)]" />
          </div>
        )}
      </section>
    );
  const net = data.income - data.expenses;
  const editorTitle = {
    account: "Add an account",
    transaction: editing ? "Edit transaction" : "Add a money move",
    budget: "Set a monthly budget",
    goal: "Create a goal",
    contribution: `Contribute to ${funding?.name}`,
    import: "Import a statement",
    invite: "Invite a member",
  };
  const accountField = (
    <Field label="Account">
      <select
        required
        name="accountId"
        defaultValue={editing?.accountId || data.accounts[0]?.id}
        className="control px-3"
      >
        {data.accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </Field>
  );
  const entryRows = (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-[var(--surface-raised)] text-xs text-[var(--ink-soft)]">
          <tr>
            <th className="px-5 py-4 font-medium">Money move</th>
            <th className="hidden px-4 py-4 font-medium sm:table-cell">
              Category
            </th>
            <th className="px-4 py-4 text-right font-medium">Amount</th>
            <th className="px-3 py-4">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b last:border-b-0 hover:bg-[var(--surface-raised)]"
            >
              <td className="max-w-[230px] px-5 py-4">
                <p className="truncate font-medium">{entry.merchant}</p>
                <p className="mt-1 text-xs text-[var(--ink-soft)]">
                  {entry.date} ·{" "}
                  {
                    data.accounts.find(
                      (account) => account.id === entry.accountId,
                    )?.name
                  }
                </p>
              </td>
              <td className="hidden px-4 py-4 text-xs sm:table-cell">
                {entry.category}
              </td>
              <td
                className={`whitespace-nowrap px-4 py-4 text-right font-semibold ${entry.type === "income" ? "text-[var(--mint-deep)]" : ""}`}
              >
                {entry.type === "income" ? "+" : "−"}
                {money(entry.amount)}
              </td>
              <td className="px-2 py-3">
                {canWrite && (
                  <div className="flex">
                    <button
                      aria-label={`Edit ${entry.merchant}`}
                      onClick={() => {
                        open("transaction");
                        setEditing(entry);
                      }}
                      className="rounded-lg p-2 hover:bg-[var(--surface-muted)]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      aria-label={`Delete ${entry.merchant}`}
                      onClick={() => {
                        setError("");
                        setDeleting(entry);
                      }}
                      className="rounded-lg p-2 hover:bg-red-100/40 hover:text-[var(--danger)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!entries.length && (
        <Empty
          title="Your next money move starts here."
          description="Add a transaction or import a statement to begin building your financial picture."
        />
      )}
    </div>
  );
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={`${data.role.toLowerCase()} · ${data.workspace.currency} · Hosted workspace`}
        title={data.workspace.name}
        description="Your records, saved securely to your workspace database."
      >
        <Button
          variant="outline"
          aria-label="Refresh workspace"
          disabled={loading}
          onClick={refresh}
        >
          <RefreshCw size={15} />
        </Button>
        {canWrite && (
          <Button
            disabled={!data.accounts.length}
            onClick={() => open("transaction")}
          >
            <Plus size={15} className="mr-2" /> Add money move
          </Button>
        )}
      </PageHeading>
      <FormError error={loadError} />
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border bg-[var(--mint)]/35 px-4 py-3 text-sm"
        >
          <Check size={16} className="text-[var(--mint-deep)]" />
          {notice}
        </div>
      )}
      <nav
        aria-label="Workspace views"
        className="flex gap-1 overflow-x-auto rounded-2xl border bg-[var(--surface)] p-1.5"
      >
        {(
          [
            "Overview",
            "Transactions",
            "Accounts",
            "Budgets",
            "Goals",
            "Members",
          ] as View[]
        ).map((tab) => (
          <button
            key={tab}
            aria-pressed={view === tab}
            onClick={() => setView(tab)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold ${view === tab ? "bg-[var(--ink)] text-[var(--surface)]" : "text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]"}`}
          >
            {tab}
          </button>
        ))}
      </nav>
      {view === "Overview" && (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.5fr,1fr]">
            <section className="relative overflow-hidden rounded-3xl bg-[#101b16] p-7 text-white sm:p-9">
              <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full bg-[#167852]/30 blur-3xl" />
              <div className="relative">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/70">
                  <WalletCards size={16} /> This month’s cash flow
                </p>
                <p className="mt-7 text-5xl font-semibold tracking-[-.06em]">
                  {money(net)}
                </p>
                <p className="mt-4 text-sm text-white/65">
                  Your recorded income, after expenses.
                </p>
                <div className="mt-10 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                    <p className="flex items-center gap-2 text-xs text-white/70">
                      <ArrowDownLeft size={15} /> Income
                    </p>
                    <p className="mt-3 text-xl font-semibold text-[#b8f2d0]">
                      {money(data.income)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                    <p className="flex items-center gap-2 text-xs text-white/70">
                      <ArrowUpRight size={15} /> Expenses
                    </p>
                    <p className="mt-3 text-xl font-semibold">
                      {money(data.expenses)}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            <section className="surface p-7">
              <Landmark size={24} className="text-[var(--mint-deep)]" />
              <p className="eyebrow mt-7">Tracked net worth</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight">
                {money(data.balance)}
              </p>
              <p className="mt-5 text-sm leading-7 text-[var(--ink-soft)]">
                Across {data.accounts.length} accounts. Opening balances and
                recorded transactions reconcile to this total.
              </p>
              <button
                onClick={() => setView("Accounts")}
                className="mt-6 text-sm font-semibold text-[var(--mint-deep)]"
              >
                Review accounts →
              </button>
            </section>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="surface p-7">
              <h3 className="text-lg font-semibold">
                This month’s spending plan
              </h3>
              {data.budgets.length ? (
                <div className="mt-6 space-y-5">
                  {data.budgets.map((budget) => (
                    <div key={budget.id}>
                      <div className="mb-3 flex justify-between gap-3 text-sm">
                        <span>{budget.category}</span>
                        <span>
                          {money(budget.spent)}{" "}
                          <span className="text-[var(--ink-soft)]">
                            / {money(budget.limit)}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface-muted)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (budget.spent / budget.limit) * 100)}%`,
                            background: categoryColors[budget.category],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="Make a little room."
                  description="Set your first category budget and turn spending into a plan."
                >
                  {canWrite && (
                    <Button variant="outline" onClick={() => open("budget")}>
                      Set a budget
                    </Button>
                  )}
                </Empty>
              )}
            </section>
            <section className="surface overflow-hidden">
              <h3 className="px-6 py-5 text-lg font-semibold">
                Recent activity
              </h3>
              {entryRows}
            </section>
          </div>
        </>
      )}
      {view === "Transactions" && (
        <section className="surface overflow-hidden">
          <div className="flex flex-wrap gap-3 border-b p-5">
            <label className="relative flex-1">
              <span className="sr-only">Search hosted transactions</span>
              <Search
                size={16}
                className="absolute left-3 top-3.5 text-[var(--ink-soft)]"
              />
              <input
                value={query}
                onChange={(event) => {
                  setCursor(null);
                  setQuery(event.target.value);
                }}
                className="control w-full pl-9 pr-3 text-sm"
                placeholder="Search transactions"
              />
            </label>
            {canWrite && (
              <Button
                variant="outline"
                disabled={!data.accounts.length}
                onClick={() => open("import")}
              >
                <Upload size={15} className="mr-2" />
                Import
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                download(
                  exportCsv(
                    entries.map((entry) => ({
                      ...entry,
                      category: entry.category as (typeof categories)[number],
                    })),
                  ),
                  "finsight-current-page.csv",
                  "text/csv",
                )
              }
            >
              <Download size={15} className="mr-2" />
              Export page
            </Button>
          </div>
          {entryRows}
          <div className="flex items-center justify-between border-t p-5 text-xs text-[var(--ink-soft)]">
            <span>{entries.length} records on this page</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!cursor}
                onClick={() => setCursor(null)}
              >
                First page
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!nextCursor}
                onClick={() => setCursor(nextCursor)}
              >
                Next page
              </Button>
            </div>
          </div>
        </section>
      )}
      {view === "Accounts" && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your manual accounts</h3>
            {canWrite && (
              <Button onClick={() => open("account")}>
                <Plus size={15} className="mr-2" /> Add account
              </Button>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.accounts.map((account) => (
              <article key={account.id} className="surface p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--mint)] text-[var(--mint-deep)]">
                  <Landmark size={21} />
                </span>
                <h3 className="mt-6 text-lg font-semibold">{account.name}</h3>
                <p className="mt-2 text-xs text-[var(--ink-soft)]">
                  {account.type} · Manual · USD
                </p>
                <p className="mt-7 text-3xl font-semibold tracking-tight">
                  {money(account.balance)}
                </p>
                <p className="mt-4 text-xs text-[var(--ink-soft)]">
                  Opening balance {money(account.openingBalance)}
                </p>
              </article>
            ))}
          </div>
          {!data.accounts.length && (
            <section className="surface">
              <Empty
                title="Start with one account."
                description="Set an opening balance, then record the money moving through it."
              >
                {canWrite && (
                  <Button onClick={() => open("account")}>
                    Add your first account
                  </Button>
                )}
              </Empty>
            </section>
          )}
          <p className="text-xs text-[var(--ink-soft)]">
            Live bank aggregation is not enabled yet. Import CSV or OFX
            statements from the Transactions tab.
          </p>
        </>
      )}
      {view === "Budgets" && (
        <section className="surface p-7">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Budgets · {localDate().slice(0, 7)}
            </h3>
            {canWrite && (
              <Button onClick={() => open("budget")}>Set budget</Button>
            )}
          </div>
          <div className="mt-7 space-y-7">
            {data.budgets.map((budget) => (
              <div key={budget.id}>
                <div className="mb-3 flex justify-between gap-3 text-sm">
                  <span className="font-medium">{budget.category}</span>
                  <span>
                    {money(budget.spent)} / {money(budget.limit)}
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-muted)]">
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
                <p className="mt-2 text-xs text-[var(--ink-soft)]">
                  {money(Math.abs(budget.limit - budget.spent))}{" "}
                  {budget.spent > budget.limit ? "over budget" : "remaining"}
                </p>
              </div>
            ))}
          </div>
          {!data.budgets.length && (
            <Empty
              title="Give your spending a direction."
              description="Set a category limit for the current month. Saving the same category adjusts its limit."
            />
          )}
        </section>
      )}
      {view === "Goals" && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your next chapter</h3>
            {canWrite && (
              <Button onClick={() => open("goal")}>
                <Plus size={15} className="mr-2" /> Create goal
              </Button>
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.goals.map((goal) => (
              <article key={goal.id} className="surface p-6">
                <Target size={25} className="text-[var(--mint-deep)]" />
                <h3 className="mt-6 text-lg font-semibold">{goal.name}</h3>
                <p className="mt-2 text-xs text-[var(--ink-soft)]">
                  Target date {goal.due.slice(0, 10)}
                </p>
                <p className="mt-7 text-3xl font-semibold tracking-tight">
                  {money(goal.saved)}
                </p>
                <div className="mt-4 h-2 rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--mint-deep)]"
                    style={{
                      width: `${Math.min(100, (goal.saved / goal.target) * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs text-[var(--ink-soft)]">
                  {money(goal.target - goal.saved)} to go
                </p>
                {canWrite && (
                  <Button
                    variant="outline"
                    className="mt-6 w-full"
                    disabled={goal.saved >= goal.target}
                    onClick={() => {
                      open("contribution");
                      setFunding(goal);
                    }}
                  >
                    {goal.saved >= goal.target
                      ? "Goal reached ✓"
                      : "Record contribution"}
                  </Button>
                )}
              </article>
            ))}
          </div>
          {!data.goals.length && (
            <section className="surface">
              <Empty
                title="Something worth working toward."
                description="Create a goal and record savings you have already earmarked."
              />
            </section>
          )}
          <p className="text-xs leading-6 text-[var(--ink-soft)]">
            Contributions track earmarked savings. They do not move money or
            change account balances.
          </p>
        </>
      )}
      {view === "Members" && (
        <section className="surface p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">A shared picture</p>
              <h3 className="mt-3 text-xl font-semibold">
                People and permissions
              </h3>
            </div>
            {canManage && (
              <Button onClick={() => open("invite")}>
                <Users size={15} className="mr-2" /> Invite member
              </Button>
            )}
          </div>
          <div className="mt-7 divide-y">
            {data.members.map((member) => (
              <div
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="text-sm font-semibold">{member.user.name}</p>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">
                    {member.user.email}
                  </p>
                </div>
                {data.role === "OWNER" && member.role !== "OWNER" ? (
                  <select
                    aria-label={`Role for ${member.user.email}`}
                    value={member.role}
                    disabled={busy}
                    onChange={(event) =>
                      void memberRole(member.userId, event.target.value)
                    }
                    className="control px-3 text-xs"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                ) : (
                  <span className="rounded-full border px-3 py-1 text-xs capitalize">
                    {member.role.toLowerCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-xl bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--ink-soft)]">
            Owners manage roles and exports. Admins invite editors and viewers.
            Editors manage financial records. Viewers have read-only access.
            Every permission is checked by the server.
          </p>
          {data.role === "OWNER" && (
            <Button
              variant="outline"
              loading={busy}
              className="mt-6"
              onClick={() => void exportWorkspace()}
            >
              <Download size={15} className="mr-2" /> Export workspace data
            </Button>
          )}
        </section>
      )}
      <FinanceDialog
        open={!!editor}
        onClose={() => {
          if (!busy) setEditor(null);
        }}
        title={editor ? editorTitle[editor] : "Workspace action"}
        description={
          editor === "invite"
            ? "Invitations are sent to the selected email address and expire after three days."
            : "Changes are validated and saved to this hosted workspace. Amounts are in USD."
        }
      >
        {editor === "import" ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs leading-6">
              CSV headers: date,merchant,amount,type,category. Dates use
              YYYY-MM-DD. Limit: 2 MB / 1,000 rows. Duplicates are checked again
              on the server.
            </p>
            <Field label="Destination account">
              <select
                value={importAccount || data.accounts[0]?.id}
                onChange={(event) => {
                  setImportAccount(event.target.value);
                  setPreview([]);
                }}
                className="control px-3"
              >
                {data.accounts.map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="CSV or OFX statement">
              <input
                type="file"
                accept=".csv,.ofx"
                className="control max-w-full p-3 text-xs"
                onChange={(event) => void readFile(event.target.files?.[0])}
              />
            </Field>
            {preview.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border p-3 text-xs">
                <p className="mb-3 font-semibold">
                  {preview.length} rows ready for server validation
                </p>
                {preview.slice(0, 25).map((row, index) => (
                  <div
                    key={index}
                    className="flex justify-between gap-3 border-t py-2"
                  >
                    <span>{row.merchant}</span>
                    <span>{money(row.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <FormError error={error} />
            <Button
              className="w-full"
              disabled={!preview.length}
              loading={busy}
              onClick={() => void importRows()}
            >
              Import statement
            </Button>
          </div>
        ) : (
          <form
            key={`${editor}-${editing?.id ?? "new"}`}
            onSubmit={save}
            className="space-y-4"
          >
            {(editor === "account" || editor === "goal") && (
              <Field
                label={editor === "account" ? "Account name" : "Goal name"}
              >
                <input
                  required
                  name="name"
                  maxLength={80}
                  className="control px-3"
                />
              </Field>
            )}
            {editor === "account" && (
              <>
                <Field label="Account type">
                  <select name="type" className="control px-3">
                    <option>Cash</option>
                    <option>Credit</option>
                    <option>Investments</option>
                  </select>
                </Field>
                <Field label="Opening balance (USD; negative for debt)">
                  <input
                    name="balance"
                    required
                    defaultValue="0.00"
                    inputMode="decimal"
                    className="control px-3"
                  />
                </Field>
              </>
            )}
            {editor === "transaction" && (
              <>
                <Field label="Merchant or source">
                  <input
                    required
                    name="merchant"
                    maxLength={120}
                    defaultValue={editing?.merchant}
                    className="control px-3"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
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
                  <Field label="Date">
                    <input
                      required
                      type="date"
                      name="date"
                      defaultValue={editing?.date ?? localDate()}
                      className="control min-w-0 px-3"
                    />
                  </Field>
                </div>
                {accountField}
              </>
            )}
            {(editor === "transaction" || editor === "budget") && (
              <Field label="Category">
                <select
                  name="category"
                  defaultValue={editing?.category ?? "Food & dining"}
                  className="control px-3"
                >
                  {categories
                    .filter(
                      (category) =>
                        editor !== "budget" || category !== "Income",
                    )
                    .map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                </select>
              </Field>
            )}
            {["transaction", "goal", "contribution", "budget"].includes(
              editor ?? "",
            ) && (
              <Field
                label={
                  editor === "budget"
                    ? "Monthly limit (USD)"
                    : editor === "goal"
                      ? "Target amount (USD)"
                      : "Amount (USD)"
                }
              >
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
            )}
            {editor === "transaction" && (
              <Field label="Note (optional)">
                <input
                  name="note"
                  maxLength={500}
                  defaultValue={editing?.note}
                  className="control px-3"
                />
              </Field>
            )}
            {editor === "goal" && (
              <Field label="Target date">
                <input
                  required
                  name="due"
                  type="date"
                  min={localDate()}
                  className="control px-3"
                />
              </Field>
            )}
            {editor === "contribution" && (
              <p className="text-xs leading-6 text-[var(--ink-soft)]">
                Record savings you already set aside. No money is transferred.
              </p>
            )}
            {editor === "invite" && (
              <>
                <Field label="Invitee email">
                  <input
                    name="email"
                    type="email"
                    autoComplete="off"
                    required
                    className="control px-3"
                  />
                </Field>
                <Field label="Workspace role">
                  <select name="role" className="control px-3">
                    <option value="VIEWER">Viewer — read only</option>
                    <option value="EDITOR">Editor — manage finances</option>
                    {data.role === "OWNER" && (
                      <option value="ADMIN">
                        Admin — manage finances and invitations
                      </option>
                    )}
                  </select>
                </Field>
              </>
            )}
            <FormError error={error} />
            <Button loading={busy} type="submit" className="w-full">
              {editor === "invite" ? "Send invitation" : "Save changes"}
            </Button>
          </form>
        )}
      </FinanceDialog>
      <FinanceDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this transaction?"
        description={`Remove ${deleting?.merchant ?? "this transaction"}. Account balances and summaries will recalculate.`}
      >
        <FormError error={error} />
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Keep transaction
          </Button>
          <Button
            variant="destructive"
            loading={busy}
            onClick={() => void remove()}
          >
            Delete transaction
          </Button>
        </div>
      </FinanceDialog>
    </div>
  );
}
