"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyTrend } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface MonthlyBarChartProps {
  data: MonthlyTrend[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-xl">
        <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
        <p className="text-sm font-bold text-emerald-400">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#334155"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748b", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar
          className="monthly-trend-bars"
          dataKey="total"
          fill="#10b981"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
          activeBar={{ fill: "#34d399" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
