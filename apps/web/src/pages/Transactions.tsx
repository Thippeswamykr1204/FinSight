import { FormEvent, useEffect, useState } from "react";
import { Plus, Search, Upload, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  categories,
  displayDate,
  money,
  parseMoney,
  type Transaction,
} from "@finsight/shared";
import { api, idempotencyKey } from "../api";
import { useFinance } from "../finance";
import { Button, Card, EmptyState, Field, PageHeading } from "../components/ui";

export default function Transactions() {
  const { workspace, overview, refresh, role, setNotice } = useFinance();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [open, setOpen] = useState(searchParams.get("new") === "1");
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = async (next?: string) => {
    if (!workspace) return;
    setLoading(true);
    try {
      const result = await api.get<{
        items: Transaction[];
        nextCursor: string | null;
      }>(
        `/workspaces/${workspace.id}/transactions?limit=30${next ? `&cursor=${encodeURIComponent(next)}` : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      );
      setRows(next ? [...rows, ...result.items] : result.items);
      setCursor(result.nextCursor);
    } catch (caught) {
      setNotice(
        caught instanceof Error
          ? caught.message
          : "Unable to load transactions.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [workspace?.id, category]);
  if (!workspace || !overview)
    return (
      <Card>
        <EmptyState
          title="Create a workspace first"
          description="Your transactions live inside a private workspace."
        />
      </Card>
    );
  return (
    <div>
      <PageHeading
        eyebrow="The ledger"
        title="Transactions that tell the truth."
        description="Record the money moves you know. FinSight keeps every amount exact to the paise."
      >
        <Button
          disabled={role === "VIEWER"}
          onClick={() => {
            setOpen(true);
            setSearchParams({ new: "1" });
          }}
        >
          <Plus size={15} />
          Add transaction
        </Button>
        <Button
          variant="quiet"
          disabled={role === "VIEWER"}
          onClick={() => setImportOpen(true)}
        >
          <Upload size={15} />
          Import CSV
        </Button>
      </PageHeading>
      <Card>
        <div className="section-row" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 9, flex: 1, flexWrap: "wrap" }}>
            <label style={{ position: "relative", flex: "1 1 240px" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 13,
                  top: 14,
                  color: "var(--ink-faint)",
                }}
              />
              <input
                className="control"
                style={{ paddingLeft: 38 }}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void load();
                }}
                placeholder="Search merchant or source"
                aria-label="Search transactions"
              />
            </label>
            <select
              className="control"
              style={{ width: 190 }}
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setSearchParams(
                  event.target.value ? { category: event.target.value } : {},
                );
              }}
              aria-label="Filter category"
            >
              <option value="">All categories</option>
              {categories.map((value: string) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <span className="muted small">
            {rows.length}
            {cursor ? "+" : ""} shown
          </span>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Money move</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <b>{row.merchant}</b>
                      {row.note && (
                        <small
                          className="muted"
                          style={{ display: "block", marginTop: 4 }}
                        >
                          {row.note}
                        </small>
                      )}
                    </td>
                    <td>{row.category}</td>
                    <td>{displayDate(row.date)}</td>
                    <td>
                      {overview.accounts.find(
                        (account) => account.id === row.accountId,
                      )?.name ?? "Account"}
                    </td>
                    <td className={row.type === "income" ? "income" : ""}>
                      {row.type === "income" ? "+" : "−"}
                      {money(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : loading ? (
          <div className="empty-state">
            <h2>Loading the ledger…</h2>
          </div>
        ) : (
          <EmptyState
            title="A blank page can be useful"
            description="Your first transaction creates the baseline for every insight."
            action={
              <Button
                disabled={role === "VIEWER"}
                onClick={() => setOpen(true)}
              >
                Add a transaction
              </Button>
            }
          />
        )}
        {cursor && (
          <Button
            variant="quiet"
            style={{ marginTop: 18 }}
            onClick={() => void load(cursor)}
            disabled={loading}
          >
            {loading ? "Loading…" : "Load more"}
          </Button>
        )}
      </Card>
      {open && (
        <TransactionDialog
          workspaceId={workspace.id}
          accounts={overview.accounts}
          onClose={() => {
            setOpen(false);
            setSearchParams({});
          }}
          onSaved={async () => {
            setOpen(false);
            setSearchParams({});
            await refresh();
            await load();
            setNotice("Transaction saved.");
          }}
        />
      )}
      {importOpen && (
        <ImportDialog
          workspaceId={workspace.id}
          accounts={overview.accounts}
          onClose={() => setImportOpen(false)}
          onSaved={async (count) => {
            setImportOpen(false);
            await refresh();
            await load();
            setNotice(
              `${count} transaction${count === 1 ? "" : "s"} imported.`,
            );
          }}
        />
      )}
    </div>
  );
}

function TransactionDialog({
  workspaceId,
  accounts,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  accounts: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      setBusy(true);
      await api.post(
        `/workspaces/${workspaceId}/transactions`,
        {
          merchant: String(form.get("merchant")),
          amount: parseMoney(String(form.get("amount"))),
          date: String(form.get("date")),
          type: String(form.get("type")),
          category: String(form.get("category")),
          accountId: String(form.get("accountId")),
          note: String(form.get("note") ?? ""),
        },
        idempotencyKey(),
      );
      await onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Check the transaction.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Add a money move" onClose={onClose}>
      <form onSubmit={(event) => void save(event)} className="form-grid">
        <Field label="Merchant or source">
          <input
            name="merchant"
            required
            autoFocus
            placeholder="e.g. Salary or pharmacy"
          />
        </Field>
        <Field label="Amount (INR)" hint="Stored as exact paise.">
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="0.00"
          />
        </Field>
        <Field label="Date">
          <input
            name="date"
            required
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Type">
          <select name="type" defaultValue="expense">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </Field>
        <Field label="Category">
          <select name="category" defaultValue="Other">
            {categories.map((value: string) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
        <Field label="Account">
          <select
            name="accountId"
            required
            defaultValue={accounts[0]?.id ?? ""}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span>Note (optional)</span>
          <textarea
            name="note"
            maxLength={500}
            placeholder="What would be useful to remember?"
          />
        </label>
        {error && (
          <p className="error-message" style={{ gridColumn: "1 / -1" }}>
            {error}
          </p>
        )}
        <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save transaction"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ImportDialog({
  workspaceId,
  accounts,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  accounts: { id: string }[];
  onClose: () => void;
  onSaved: (count: number) => Promise<void>;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const parse = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const [header, ...lines] = text.trim().split(/\r?\n/);
      if (!header) return;
      const columns = header
        .split(",")
        .map((column) => column.trim().toLowerCase());
      setRows(
        lines
          .filter(Boolean)
          .map((line) =>
            Object.fromEntries(
              line
                .split(",")
                .map((value, index) => [columns[index], value.trim()]),
            ),
          ),
      );
    };
    reader.readAsText(file);
  };
  const save = async () => {
    try {
      if (!accounts[0])
        throw new Error("Create an account before importing transactions.");
      if (!rows.length) throw new Error("Choose a CSV file first.");
      setBusy(true);
      let imported = 0;
      for (const row of rows) {
        await api.post(
          `/workspaces/${workspaceId}/transactions`,
          {
            merchant: row.merchant ?? "Imported transaction",
            amount: parseMoney(row.amount ?? "0"),
            date: row.date ?? "",
            type: row.type === "income" ? "income" : "expense",
            category: categories.includes((row.category ?? "Other") as never)
              ? row.category
              : "Other",
            accountId: accounts[0].id,
            note: "Imported from CSV",
          },
          idempotencyKey(),
        );
        imported += 1;
      }
      await onSaved(imported);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The CSV could not be imported.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Import a statement" onClose={onClose}>
      <p className="muted small">
        CSV columns: <b>date, merchant, amount, type, category</b>. Amounts use
        INR decimals.
      </p>
      <label className="field" style={{ marginTop: 18 }}>
        <span>Statement file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) parse(file);
          }}
        />
      </label>
      {rows.length > 0 && (
        <div className="notice" style={{ marginTop: 16 }}>
          {rows.length} row{rows.length === 1 ? "" : "s"} ready to import.
        </div>
      )}
      {error && (
        <p className="error-message" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button variant="quiet" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? "Importing…" : `Import ${rows.length || ""} transactions`}
        </Button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mobile-drawer-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(680px, calc(100vw - 30px))",
          margin: "8vh auto",
          maxHeight: "84vh",
          overflowY: "auto",
        }}
      >
        <div className="section-row">
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ marginTop: 23 }}>{children}</div>
      </div>
    </div>
  );
}
