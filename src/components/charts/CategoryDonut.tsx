"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatMoney } from "@/lib/currency";

export type DonutSlice = { name: string; total: number; color: string };

// Donut chart of spending by category with a centered total.
export function CategoryDonut({
  data,
  currency,
}: {
  data: DonutSlice[];
  currency: string;
}) {
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="relative h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-medium text-slate-400">Spent</span>
        <span className="text-lg font-bold text-slate-900">{formatMoney(total, currency)}</span>
      </div>
    </div>
  );
}
