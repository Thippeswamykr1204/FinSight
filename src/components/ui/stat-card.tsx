import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  iconColor = "text-emerald-400",
  iconBg = "bg-emerald-500/15",
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-100 tracking-tight truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.value >= 0 ? "text-red-400" : "text-emerald-400"
                )}
              >
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ml-4",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}
