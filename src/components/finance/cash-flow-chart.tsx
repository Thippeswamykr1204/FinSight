"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cashFlow, type FinanceState } from "@/lib/finance/model";
import { compactMoney, money } from "@/lib/finance/region";

export default function CashFlowChart({
  state,
  months,
}: {
  state: FinanceState;
  months: number;
}) {
  const data = cashFlow(state, months);
  return (
    <div
      className="h-[255px] w-full"
      role="img"
      aria-label={`Income and expense comparison over ${months} months. Exact totals are available in the data table below the chart.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ left: 0, right: 14, top: 15, bottom: 0 }}
        >
          <defs>
            <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#54d99a" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#54d99a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="rgba(255,255,255,.12)"
            vertical={false}
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="month"
            stroke="rgba(255,255,255,.65)"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            dy={8}
          />
          <YAxis
            stroke="rgba(255,255,255,.6)"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => compactMoney(value * 100)}
            tick={{ fontSize: 10 }}
            width={64}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #405047",
              background: "#16261d",
              color: "#fff",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              money(value * 100, state.locale),
              name === "income" ? "Income" : "Expenses",
            ]}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#8fe8b6"
            strokeWidth={2.5}
            fill="url(#income-fill)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#e7a281"
            strokeWidth={2}
            strokeDasharray="4 4"
            fill="transparent"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
