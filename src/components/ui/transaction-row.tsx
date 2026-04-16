"use client";

import { useState } from "react";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TransactionForm } from "@/components/forms/transaction-form";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  TRANSACTION_TYPE_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/utils";
import type { Transaction } from "@/types";

interface TransactionRowProps {
  transaction: Transaction;
  onChanged?: (transaction: Transaction) => void;
  onDeleted?: (id: string) => void;
}

export function TransactionRow({ transaction, onChanged, onDeleted }: TransactionRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const color = CATEGORY_COLORS[transaction.category] || "#64748b";
  const isIncome = transaction.type === "INCOME";

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      if (!res.ok) return;
      onDeleted?.(transaction.id);
      setDeleteOpen(false);
    } catch {
      // handle silently
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="group flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50">
        {/* Category icon */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
          style={{ backgroundColor: `${color}20` }}
        >
          {CATEGORY_ICONS[transaction.category]}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {transaction.description}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-500">
              {formatDate(transaction.date)}
            </p>
            {transaction.recurringSeriesId && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  <Repeat className="h-3 w-3" />
                  {transaction.recurrenceFrequency ? "Recurring template" : "Recurring"}
                </span>
              )}
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${isIncome ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                {TRANSACTION_TYPE_LABELS[transaction.type]}
              </span>
          </div>
        </div>

        {/* Category badge */}
        <div className="hidden sm:block">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ color, backgroundColor: `${color}20` }}
          >
            {CATEGORY_LABELS[transaction.category]}
          </span>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
            {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Transaction"
        description="Update the transaction details"
      >
        <TransactionForm
          transaction={transaction}
          onSuccess={(updatedTransaction) => {
            onChanged?.(updatedTransaction);
            setEditOpen(false);
          }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Transaction"
        description="This action cannot be undone."
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-800/60 p-4 border border-slate-700/50">
            <p className="text-sm text-slate-300 font-medium">
              {transaction.description}
            </p>
            <p className="text-sm text-red-400 font-bold mt-1">
              {formatCurrency(transaction.amount)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatDate(transaction.date)} · {CATEGORY_LABELS[transaction.category]}
            </p>
          </div>
          <p className="text-sm text-slate-400">
            Are you sure you want to delete this transaction? This action is permanent.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
