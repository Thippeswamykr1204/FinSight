"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CategoryStat } from "@/types";
import { CATEGORY_COLORS, CATEGORY_LABELS, formatCurrency } from "@/lib/utils";

interface CategoryPieChartProps {
  data: CategoryStat[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-xl">
        <p className="text-xs font-medium text-slate-400 mb-1">
          {CATEGORY_LABELS[d.name] || d.name}
        </p>
        <p className="text-sm font-bold" style={{ color: d.payload.fill }}>
          {formatCurrency(d.value)}
        </p>
        <p className="text-xs text-slate-500">
          {d.payload.percentage.toFixed(1)}% of total
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
    {payload.map((entry: any) => (
      <div key={entry.value} className="flex items-center gap-1.5">
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-xs text-slate-400">
          {CATEGORY_LABELS[entry.value] || entry.value}
        </span>
      </div>
    ))}
  </div>
);

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={3}
          dataKey="total"
          nameKey="category"
        >
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={CATEGORY_COLORS[entry.category] || "#64748b"}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
