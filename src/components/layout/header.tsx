"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const PAGE_TITLES: Record<string, { title: string; desc: string }> = {
  "/dashboard": { title: "Dashboard", desc: "Your financial overview" },
  "/insights": { title: "Insights", desc: "Review reminders, watchlist items, and setup progress" },
  "/transactions": { title: "Transactions", desc: "Manage your expenses" },
  "/budgets": { title: "Budgets", desc: "Set and track budgets" },
};

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const page = PAGE_TITLES[pathname] ?? { title: "FinSight", desc: "" };
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
      <div>
        <h1 className="text-lg font-semibold text-slate-100">{page.title}</h1>
        <p className="text-xs text-slate-500">{page.desc}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 hidden sm:block">
          {format(new Date(), "EEEE, MMM dd yyyy")}
        </span>
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
          <Bell className="h-4 w-4" />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={loggingOut}
          onClick={handleLogout}
          className="h-8 px-2 text-slate-400 hover:text-slate-100"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
