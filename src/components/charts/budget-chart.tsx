"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CATEGORY_LABELS, formatCurrency } from "@/lib/utils";
import type { BudgetWithSpent } from "@/types";

interface BudgetChartProps {
  data: BudgetWithSpent[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-xl space-y-1">
        <p className="text-xs text-slate-400 mb-1">{CATEGORY_LABELS[label] ?? label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-xs" style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function BudgetChart({ data }: BudgetChartProps) {
  const chartData = data.map((b) => ({
    category: b.category,
    Budget: b.amount,
    Spent: b.spent,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actual</CardTitle>
        <CardDescription>Compare your budget against actual spending</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">
            No budgets set for this month
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickFormatter={(v) => CATEGORY_LABELS[v]?.split(" ")[0] ?? v}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-slate-400">{value}</span>
                )}
              />
              <Bar dataKey="Budget" fill="#334155" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Spent" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
