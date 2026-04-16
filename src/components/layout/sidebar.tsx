"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col border-r border-slate-700/50 bg-slate-900/95 backdrop-blur-md">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <span className="text-base font-bold text-slate-100 tracking-tight">FinSight</span>
          <p className="text-[10px] text-slate-500 -mt-0.5">Personal Finance</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Menu</p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-emerald-400")} />
              {label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <p className="text-[11px] text-slate-400">Track smarter, spend wiser</p>
        </div>
      </div>
    </aside>
  );
}
