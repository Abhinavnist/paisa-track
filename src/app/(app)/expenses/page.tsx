import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { monthRange, currentYearMonth, getMonthlySummary } from "@/lib/finance";
import { formatMoney } from "@/lib/currency";
import { Card } from "@/components/ui";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { FilteredExpenses } from "@/components/FilteredExpenses";
import type { TxView } from "@/lib/types";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const now = currentYearMonth();
  const year = Number(sp.year) || now.year;
  const month = Number(sp.month) || now.month;

  const { start, end } = monthRange(year, month);
  const [rows, categories, summary] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
    getMonthlySummary(userId, year, month),
  ]);

  const transactions: TxView[] = rows.map((t) => ({
    id: t.id,
    amount: t.amount,
    type: t.type,
    date: t.date.toISOString(),
    note: t.note,
    source: t.source,
    category: t.category,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">History</h1>

      <MonthSwitcher year={year} month={month} />

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-xs text-slate-400">Income</p>
          <p className="text-lg font-bold text-emerald-600">
            {formatMoney(summary.income, summary.currency)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-400">Spent</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {formatMoney(summary.expense, summary.currency)}
          </p>
        </Card>
      </div>

      <Card>
        <FilteredExpenses
          transactions={transactions}
          categories={categories}
          currency={summary.currency}
        />
      </Card>
    </div>
  );
}
