"use client";

import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatMoney } from "@/lib/currency";
import type { TrendPoint } from "@/lib/finance";

// Grouped income-vs-expense bars for the last few months.
export function TrendBar({ data, currency }: { data: TrendPoint[]; currency: string }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
          <Tooltip
            formatter={(v) => formatMoney(typeof v === "number" ? v : Number(v), currency)}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" name="Spent" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
