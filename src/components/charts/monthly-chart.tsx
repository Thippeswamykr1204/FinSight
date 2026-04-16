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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { MonthlyTrend } from "@/types";

interface MonthlyChartProps {
  data: MonthlyTrend[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-xl">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-emerald-400">
          ₹{payload[0].value.toLocaleString("en-IN")}
        </p>
      </div>
    );
  }
  return null;
};

export function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Monthly Spending Trend</CardTitle>
        <CardDescription>Last 6 months expense overview</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
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
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(16,185,129,0.05)" }} />
              <Bar
                dataKey="total"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
