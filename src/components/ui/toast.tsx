"use client";

import * as React from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-sm animate-in slide-in-from-right-full duration-300",
              t.type === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
              t.type === "error" && "border-red-500/30 bg-red-500/10 text-red-300",
              t.type === "info" && "border-slate-600 bg-slate-800 text-slate-300"
            )}
          >
            {t.type === "success" && <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            {t.type === "info" && <Info className="h-4 w-4 mt-0.5 shrink-0" />}
            <p className="text-sm flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
