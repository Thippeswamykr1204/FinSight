"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { stateSchema, seedState, type FinanceState } from "@/lib/finance/model";

const key = "finsight-demo-v2";
type Context = {
  state: FinanceState;
  update: (updater: (state: FinanceState) => FinanceState) => void;
  notice: (message: string) => void;
  reset: (empty?: boolean) => void;
  ready: boolean;
};
const FinanceContext = createContext<Context | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(() => seedState());
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setState(stateSchema.parse(JSON.parse(saved)));
    } catch {
      setMessage(
        "Saved demo data could not be read. A fresh sample workspace is ready.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  function update(updater: (current: FinanceState) => FinanceState) {
    const next = stateSchema.parse(updater(state));
    const accounts = new Set(next.accounts.map((account) => account.id));
    if (
      next.transactions.some(
        (transaction) => !accounts.has(transaction.accountId),
      )
    )
      throw new Error("Choose an existing account.");
    const budgets = next.budgets.map(
      (budget) => `${budget.month}:${budget.category}`,
    );
    if (new Set(budgets).size !== budgets.length)
      throw new Error("A budget for this category already exists this month.");
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      throw new Error(
        "Browser storage is full or unavailable. Export your data before continuing.",
      );
    }
    setState(next);
  }
  function reset(empty = false) {
    const next = seedState();
    update(() =>
      empty
        ? {
            ...next,
            transactions: [],
            budgets: [],
            goals: [],
            accounts: [],
            name: "Your",
            onboarded: true,
          }
        : next,
    );
  }
  return (
    <FinanceContext.Provider
      value={{ state, update, notice: setMessage, reset, ready }}
    >
      {children}
      {message && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-[100] flex items-center justify-between gap-3 rounded-2xl bg-[#101416] px-5 py-4 text-sm text-white shadow-xl sm:left-auto sm:max-w-md lg:bottom-6"
        >
          {message}
          <button
            onClick={() => setMessage("")}
            aria-label="Dismiss notification"
            className="px-2 text-xl"
          >
            ×
          </button>
        </div>
      )}
    </FinanceContext.Provider>
  );
}
export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("FinanceProvider is missing");
  return context;
}
