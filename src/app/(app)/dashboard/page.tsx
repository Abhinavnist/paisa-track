import Link from "next/link";
import { format, endOfMonth } from "date-fns";
import { ArrowUpRight, TrendingUp, Wallet, PiggyBank, Target, AlertTriangle } from "lucide-react";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  ensureSalaryCredited,
  getMonthlySummary,
  currentYearMonth,
} from "@/lib/finance";
import { processRecurring } from "@/lib/recurring";
import { formatMoney } from "@/lib/currency";
import { Card } from "@/components/ui";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { TransactionRow } from "@/components/TransactionRow";
import type { TxView } from "@/lib/types";

export default async function DashboardPage() {
  const userId = await requireUserId();
  await Promise.all([ensureSalaryCredited(userId), processRecurring(userId)]);

  const { year, month } = currentYearMonth();
  const [summary, recentRaw, user] = await Promise.all([
    getMonthlySummary(userId, year, month),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
  ]);

  const recent: TxView[] = recentRaw.map((t) => ({
    id: t.id,
    amount: t.amount,
    type: t.type,
    date: t.date.toISOString(),
    note: t.note,
    source: t.source,
    category: t.category,
  }));

  const currency = summary.currency;
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");
  const budgetPct =
    summary.budget > 0 ? Math.min((summary.expense / summary.budget) * 100, 100) : 0;
  const firstName = user.name?.split(" ")[0] ?? "there";

  // Safe-to-spend per day: remaining money ÷ days left in the month.
  const now = new Date();
  const daysLeft = Math.max(endOfMonth(now).getDate() - now.getDate() + 1, 1);
  const remaining = summary.budget > 0 ? summary.budgetLeft : summary.balance;
  const perDay = remaining > 0 ? remaining / daysLeft : 0;

  const overCats = summary.categoryBudgets.filter((c) => c.status === "over");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Hi {firstName} 👋</p>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{monthLabel}</h1>
      </div>

      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-700/25">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm text-emerald-50/80">Balance left this month</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight">
            {formatMoney(summary.balance, currency)}
          </p>
          {perDay > 0 && (
            <p className="mt-1 text-sm text-emerald-50/90">
              💡 Safe to spend <b>{formatMoney(perDay, currency)}/day</b> for {daysLeft} days
            </p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat icon={<ArrowUpRight className="h-4 w-4" />} label="Income" value={formatMoney(summary.income, currency)} />
            <Stat icon={<TrendingUp className="h-4 w-4" />} label="Spent" value={formatMoney(summary.expense, currency)} />
          </div>
        </div>
      </div>

      {/* Over-budget alert banner */}
      {overCats.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You&apos;re over budget on{" "}
            <b>{overCats.map((c) => c.name).join(", ")}</b>. Check the category budgets below.
          </span>
        </div>
      )}

      {/* Overall budget progress */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Monthly budget</span>
          </div>
          {summary.budget > 0 ? (
            <span className={"text-sm font-semibold " + (summary.overBudget ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}>
              {formatMoney(summary.expense, currency)} / {formatMoney(summary.budget, currency)}
            </span>
          ) : (
            <Link href="/settings" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Set budget
            </Link>
          )}
        </div>

        {summary.budget > 0 && (
          <>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={
                  "h-full rounded-full transition-all " +
                  (summary.overBudget
                    ? "bg-gradient-to-r from-red-500 to-rose-600"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500")
                }
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className={"text-xs " + (summary.overBudget ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}>
              {summary.overBudget
                ? `Over budget by ${formatMoney(-summary.budgetLeft, currency)} ⚠️`
                : `${formatMoney(summary.budgetLeft, currency)} left to spend`}
            </p>
          </>
        )}
      </Card>

      {/* Per-category budgets */}
      {summary.categoryBudgets.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Category budgets</span>
          </div>
          <ul className="space-y-3">
            {summary.categoryBudgets.map((c) => {
              const barColor =
                c.status === "over"
                  ? "bg-red-500"
                  : c.status === "near"
                  ? "bg-amber-500"
                  : "bg-emerald-500";
              return (
                <li key={c.categoryId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                    <span className={"font-medium " + (c.status === "over" ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400")}>
                      {formatMoney(c.spent, currency)} / {formatMoney(c.budget, currency)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div className={"h-full rounded-full " + barColor} style={{ width: `${Math.min(c.pct, 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Spending breakdown */}
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Where your money went</span>
        </div>

        {summary.byCategory.length === 0 ? (
          <EmptyHint>No expenses yet this month. Tap ➕ to add your first one.</EmptyHint>
        ) : (
          <>
            <CategoryDonut
              data={summary.byCategory.map((c) => ({ name: c.name, total: c.total, color: c.color }))}
              currency={currency}
            />
            <ul className="mt-3 space-y-2">
              {summary.byCategory.slice(0, 6).map((c) => {
                const pct = summary.expense > 0 ? (c.total / summary.expense) * 100 : 0;
                return (
                  <li key={c.categoryId ?? c.name} className="flex items-center gap-3 text-sm">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="flex-1 text-slate-700 dark:text-slate-200">{c.name}</span>
                    <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                    <span className="w-20 text-right font-semibold text-slate-800 dark:text-slate-100">
                      {formatMoney(c.total, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Recent transactions */}
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent activity</span>
          <Link href="/expenses" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            See all
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyHint>Nothing here yet.</EmptyHint>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} currency={currency} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-xs text-emerald-50/80">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{children}</p>;
}
