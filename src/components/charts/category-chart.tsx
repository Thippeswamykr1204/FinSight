"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CATEGORY_COLORS, CATEGORY_LABELS, formatCurrency } from "@/lib/utils";
import type { CategoryStat } from "@/types";

interface CategoryChartProps {
  data: CategoryStat[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-xl">
        <p className="text-xs text-slate-400 mb-1">{CATEGORY_LABELS[d.category]}</p>
        <p className="text-sm font-semibold text-slate-100">{formatCurrency(d.total)}</p>
        <p className="text-xs text-slate-500">{d.percentage.toFixed(1)}% of total</p>
      </div>
    );
  }
  return null;
};

const renderCustomLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
      {payload.map((entry: any, index: number) => (
        <li key={index} className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {CATEGORY_LABELS[entry.value] ?? entry.value}
        </li>
      ))}
    </ul>
  );
};

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = data.map((d) => ({ ...d, name: d.category }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>This month's breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">
            No transactions this month
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="total"
                nameKey="category"
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={CATEGORY_COLORS[entry.category]}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderCustomLegend} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
