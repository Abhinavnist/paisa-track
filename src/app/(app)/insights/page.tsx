import { format, endOfMonth } from "date-fns";
import { TrendingUp, TrendingDown, CalendarDays, Flame } from "lucide-react";
import { requireUserId } from "@/lib/session";
import {
  getMonthlySummary,
  getMonthlyTrends,
  getCategoryDeltas,
  currentYearMonth,
} from "@/lib/finance";
import { formatMoney } from "@/lib/currency";
import { Card } from "@/components/ui";
import { TrendBar } from "@/components/charts/TrendBar";
import { ReportButtons } from "@/components/ReportButtons";

export default async function InsightsPage() {
  const userId = await requireUserId();
  const { year, month } = currentYearMonth();

  const [summary, trends, deltas] = await Promise.all([
    getMonthlySummary(userId, year, month),
    getMonthlyTrends(userId, 6),
    getCategoryDeltas(userId, year, month),
  ]);

  const currency = summary.currency;
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = endOfMonth(now).getDate();
  const avgDaily = dayOfMonth > 0 ? summary.expense / dayOfMonth : 0;
  const projected = avgDaily * daysInMonth;
  const topCat = summary.byCategory[0];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Insights</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Avg / day"
          value={formatMoney(avgDaily, currency)}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Projected month"
          value={formatMoney(projected, currency)}
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Top category"
          value={topCat ? topCat.name : "—"}
          sub={topCat ? formatMoney(topCat.total, currency) : undefined}
        />
        <StatCard
          icon={<TrendingDown className="h-4 w-4" />}
          label="Spent this month"
          value={formatMoney(summary.expense, currency)}
        />
      </div>

      {/* 6-month trend */}
      <Card>
        <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Last 6 months
        </h2>
        <TrendBar data={trends} currency={currency} />
      </Card>

      {/* Category changes vs last month */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          vs last month
        </h2>
        {deltas.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">
            Not enough history yet — check back next month.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {deltas.map((d) => {
              const up = d.current >= d.previous;
              return (
                <li key={d.name} className="flex items-center gap-3 text-sm">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 text-slate-700 dark:text-slate-200">{d.name}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {formatMoney(d.current, currency)}
                  </span>
                  <span
                    className={
                      "flex w-16 items-center justify-end gap-0.5 text-xs font-medium " +
                      (up ? "text-red-500" : "text-emerald-600")
                    }
                  >
                    {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(d.pct).toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Reports */}
      <Card>
        <h2 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Export {format(new Date(year, month - 1, 1), "MMMM yyyy")}
        </h2>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          Download your statement as PDF or your data as CSV.
        </p>
        <ReportButtons year={year} month={month} currency={currency} />
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 truncate text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}
