"use client";

import { useState, useEffect, useCallback, useDeferredValue } from "react";
import { Plus, Filter, Search, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "@/components/forms/transaction-form";
import { TransactionRow } from "@/components/ui/transaction-row";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPES,
} from "@/lib/utils";
import type {
  Transaction,
  PaginatedResponse,
  TransactionImportResult,
  TransactionType,
} from "@/types";

export default function TransactionsPage() {
  const [data, setData] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<"" | TransactionType>("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [generatingRecurring, setGeneratingRecurring] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [skipDuplicateImports, setSkipDuplicateImports] = useState(true);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<TransactionImportResult | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const LIMIT = 15;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(category && { category }),
        ...(type && { type }),
        ...(deferredSearch && { search: deferredSearch }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      });
      const res = await fetch(`/api/transactions?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setData(json.data);
    } catch (e: any) {
      setError(e.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page, type, category, deferredSearch, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const hasActiveFilters = Boolean(type || category || search || startDate || endDate);

  function clearFilters() {
    setCategory("");
    setType("");
    setSearch("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  async function generateRecurringTransactions() {
    setGeneratingRecurring(true);
    setActionMessage("");
    try {
      const res = await fetch("/api/transactions/recurring/generate", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to generate recurring transactions");

      const createdCount = json.data?.createdCount ?? 0;
      setActionMessage(
        createdCount > 0
          ? `${createdCount} recurring transaction${createdCount === 1 ? "" : "s"} generated.`
          : "No recurring transactions were due right now."
      );
      fetchTransactions();
    } catch (e: any) {
      setActionMessage(e.message || "Failed to generate recurring transactions");
    } finally {
      setGeneratingRecurring(false);
    }
  }

  async function submitImport(dryRun: boolean) {
    if (!selectedImportFile) {
      setActionMessage("Choose a CSV file before importing.");
      return null;
    }

    const csv = await selectedImportFile.text();
    const res = await fetch("/api/transactions/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, dryRun, skipDuplicates: skipDuplicateImports }),
    });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || "Failed to import transactions");
    }

    return json.data as TransactionImportResult;
  }

  async function previewImportTransactions() {
    setPreviewingImport(true);
    setActionMessage("");
    try {
      const preview = await submitImport(true);
      if (!preview) return;
      setImportPreview(preview);
      setActionMessage(
        `${preview.rows.length} preview row${preview.rows.length === 1 ? "" : "s"} ready. ${preview.duplicateCount} duplicate${preview.duplicateCount === 1 ? "" : "s"} detected.`
      );
    } catch (e: any) {
      setActionMessage(e.message || "Failed to preview transactions");
    } finally {
      setPreviewingImport(false);
    }
  }

  async function importTransactionsFromCsv() {
    if (!selectedImportFile) {
      setActionMessage("Choose a CSV file before importing.");
      return;
    }

    setImporting(true);
    setActionMessage("");
    try {
      const result = await submitImport(false);
      if (!result) return;

      const importedCount = result.importedCount ?? 0;
      setActionMessage(
        `${importedCount} transaction${importedCount === 1 ? "" : "s"} imported from ${selectedImportFile.name}.${result.duplicateCount > 0 ? ` ${result.duplicateCount} duplicate${result.duplicateCount === 1 ? "" : "s"} skipped.` : ""}`
      );
      setSelectedImportFile(null);
      setImportPreview(null);
      setImportOpen(false);
      setPage(1);
      fetchTransactions();
    } catch (e: any) {
      setActionMessage(e.message || "Failed to import transactions");
    } finally {
      setImporting(false);
    }
  }

  function handleTransactionChanged(updatedTransaction: Transaction) {
    setData((current) => {
      if (!current) return current;

      return {
        ...current,
        data: current.data.map((transaction) =>
          transaction.id === updatedTransaction.id ? updatedTransaction : transaction
        ),
      };
    });
    fetchTransactions();
  }

  function handleTransactionDeleted(deletedId: string) {
    setData((current) => {
      if (!current) return current;

      const nextData = current.data.filter((transaction) => transaction.id !== deletedId);
      return {
        ...current,
        data: nextData,
        total: Math.max(0, current.total - 1),
        totalPages: Math.max(1, Math.ceil(Math.max(0, current.total - 1) / current.limit)),
      };
    });
    fetchTransactions();
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          <div className="flex-1 relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search descriptions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-500 shrink-0" />
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value as "" | TransactionType);
                setCategory("");
                setPage(1);
              }}
              className="w-full sm:w-36"
            >
              <option value="">All Types</option>
              {TRANSACTION_TYPES.map((item) => (
                <option key={item} value={item}>{TRANSACTION_TYPE_LABELS[item]}</option>
              ))}
            </Select>
            <Select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-44"
            >
              <option value="">All Categories</option>
              {CATEGORIES.filter((cat) => {
                if (!type) return true;
                return type === "INCOME"
                  ? ["SALARY", "FREELANCE", "INVESTMENTS", "OTHER_INCOME"].includes(cat)
                  : ["FOOD", "RENT", "TRAVEL", "SHOPPING", "ENTERTAINMENT"].includes(cat);
              }).map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </Select>
          </div>

          <div className="flex w-full lg:w-auto gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="w-full lg:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={generateRecurringTransactions}
              loading={generatingRecurring}
              className="w-full lg:w-auto"
            >
              Generate Recurring
            </Button>
            <Button onClick={() => setAddOpen(true)} className="w-full lg:w-auto shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="w-full sm:w-44">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">From</p>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-full sm:w-44">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">To</p>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex w-full sm:w-auto gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full sm:w-auto"
            >
              Clear Filters
            </Button>
          </div>
        </div>
        {actionMessage && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            {actionMessage}
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>
                {data ? `${data.total} total transactions` : "Loading..."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : !data?.data.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl">
                📭
              </div>
              <p className="text-slate-400 text-sm">
                {hasActiveFilters ? "No matching transactions" : "No transactions yet"}
              </p>
              {!hasActiveFilters && (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add your first
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {data.data.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  onChanged={handleTransactionChanged}
                  onDeleted={handleTransactionDeleted}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-500">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add modal */}
      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setSelectedImportFile(null);
          setImportPreview(null);
        }}
        title="Import Transactions"
        description="Upload a CSV with amount, date, description, type, and category columns."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 text-sm text-slate-300">
            <p className="font-medium text-slate-100">Expected headers</p>
            <p className="mt-2 text-xs text-slate-400">
              `amount,date,description,type,category,recurrenceFrequency`
            </p>
            <p className="mt-3 text-xs text-slate-500">
              `recurrenceFrequency` is optional. Supported values: `MONTHLY`.
              Categories can use either the enum values like `FOOD` or the visible labels like `Food & Dining`.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-200">CSV file</p>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setSelectedImportFile(e.target.files?.[0] ?? null);
                setImportPreview(null);
              }}
            />
            <p className="text-xs text-slate-500">
              {selectedImportFile ? `Selected: ${selectedImportFile.name}` : "Choose a bank export or transaction CSV file."}
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={skipDuplicateImports}
              onChange={(e) => setSkipDuplicateImports(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
            />
            Skip duplicate transactions during import
          </label>

          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sample row</p>
            <pre className="mt-2 overflow-x-auto text-xs text-slate-300">
{`amount,date,description,category,recurrenceFrequency
250.50,2026-03-29,Coffee,EXPENSE,FOOD,
1299,2026-03-01,Netflix subscription,EXPENSE,Entertainment,MONTHLY
85000,2026-03-01,Monthly salary,INCOME,Salary,MONTHLY`}
            </pre>
          </div>

          {importPreview && (
            <div className="space-y-3 rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span>{importPreview.importedCount} rows ready to import</span>
                <span>{importPreview.duplicateCount} duplicates detected</span>
                <span>{importPreview.skipDuplicates ? "Duplicates will be skipped" : "Duplicates will be imported"}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Row</th>
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Description</th>
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 pr-4 font-medium">Category</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.map((row) => (
                      <tr key={`${row.rowNumber}-${row.description}`} className="border-t border-slate-800">
                        <td className="py-2 pr-4 text-slate-500">{row.rowNumber}</td>
                        <td className="py-2 pr-4">{new Date(row.date).toLocaleDateString("en-IN")}</td>
                        <td className="py-2 pr-4">{row.description}</td>
                        <td className="py-2 pr-4">{TRANSACTION_TYPE_LABELS[row.type]}</td>
                        <td className="py-2 pr-4">{CATEGORY_LABELS[row.category]}</td>
                        <td className="py-2 pr-4">₹{row.amount.toLocaleString("en-IN")}</td>
                        <td className="py-2">
                          <span className={row.duplicate ? "text-amber-400" : "text-emerald-400"}>
                            {row.duplicate ? "Duplicate" : "New"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImportOpen(false);
                setSelectedImportFile(null);
                setImportPreview(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={previewImportTransactions}
              loading={previewingImport}
              className="flex-1"
            >
              Preview Import
            </Button>
            <Button
              type="button"
              onClick={importTransactionsFromCsv}
              loading={importing}
              className="flex-1"
            >
              Import Transactions
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Transaction"
        description="Record a new expense"
      >
        <TransactionForm
          onSuccess={() => {
            setAddOpen(false);
            fetchTransactions();
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  );
}
