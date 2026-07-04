import { startOfMonth, endOfMonth, format } from "date-fns";
import { prisma } from "@/lib/prisma";

// Range [start, end) for a given year/month (month is 1-12).
export function monthRange(year: number, month: number) {
  const anchor = new Date(year, month - 1, 1);
  return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
}

export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export type CategorySlice = {
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
};

export type CategoryBudget = {
  categoryId: string;
  name: string;
  color: string;
  budget: number;
  spent: number;
  pct: number; // 0..100+ (spent / budget)
  status: "ok" | "near" | "over"; // near ≥80%, over ≥100%
};

export type MonthlySummary = {
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number; // income - expense
  budget: number;
  budgetLeft: number; // budget - expense
  overBudget: boolean;
  currency: string;
  byCategory: CategorySlice[];
  categoryBudgets: CategoryBudget[]; // only categories with a budget set
};

// Aggregate a user's income/expenses for one month + a per-category expense breakdown.
export async function getMonthlySummary(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlySummary> {
  const { start, end } = monthRange(year, month);

  const [user, totals, byCatRaw, categories] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { currency: true, monthlyBudget: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, monthlyBudget: true },
    }),
  ]);

  const income = totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
  const expense = totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const spentByCat = new Map(byCatRaw.map((r) => [r.categoryId, r._sum.amount ?? 0]));

  const byCategory: CategorySlice[] = byCatRaw
    .map((row) => {
      const cat = row.categoryId ? catMap.get(row.categoryId) : undefined;
      return {
        categoryId: row.categoryId,
        name: cat?.name ?? "Uncategorized",
        color: cat?.color ?? "#94a3b8",
        total: row._sum.amount ?? 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const categoryBudgets: CategoryBudget[] = categories
    .filter((c) => c.monthlyBudget > 0)
    .map((c) => {
      const spent = spentByCat.get(c.id) ?? 0;
      const pct = (spent / c.monthlyBudget) * 100;
      return {
        categoryId: c.id,
        name: c.name,
        color: c.color,
        budget: c.monthlyBudget,
        spent,
        pct,
        status: pct >= 100 ? "over" : pct >= 80 ? "near" : "ok",
      } as CategoryBudget;
    })
    .sort((a, b) => b.pct - a.pct);

  const budget = user.monthlyBudget;
  return {
    year,
    month,
    income,
    expense,
    balance: income - expense,
    budget,
    budgetLeft: budget - expense,
    overBudget: budget > 0 && expense > budget,
    currency: user.currency,
    byCategory,
    categoryBudgets,
  };
}

// Lazy monthly-salary credit: ensure exactly one AUTO_SALARY income exists for the
// current month when the user has a salary configured. Safe to call on every load.
export async function ensureSalaryCredited(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { monthlySalary: true, salaryCreditDay: true },
  });
  if (!user || user.monthlySalary <= 0) return;

  const { year, month } = currentYearMonth();
  const { start, end } = monthRange(year, month);

  const existing = await prisma.transaction.findFirst({
    where: {
      userId,
      source: "AUTO_SALARY",
      type: "INCOME",
      date: { gte: start, lte: end },
    },
    select: { id: true },
  });
  if (existing) return;

  // Credit on the configured day, clamped into the current month.
  const day = Math.min(Math.max(user.salaryCreditDay, 1), end.getDate());
  const creditDate = new Date(year, month - 1, day);

  await prisma.transaction.create({
    data: {
      userId,
      amount: user.monthlySalary,
      type: "INCOME",
      source: "AUTO_SALARY",
      date: creditDate,
      note: "Monthly salary",
    },
  });
}

// ---- Insights ----

export type TrendPoint = {
  year: number;
  month: number;
  label: string; // e.g. "Jul"
  income: number;
  expense: number;
};

// Income vs expense totals for the last `months` months (oldest → newest, incl. current).
export async function getMonthlyTrends(
  userId: string,
  months = 6,
): Promise<TrendPoint[]> {
  const now = new Date();
  const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - (months - 1), 1));
  const end = endOfMonth(now);

  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lte: end } },
    select: { date: true, type: true, amount: true },
  });

  const points: TrendPoint[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    points.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: format(d, "MMM"), income: 0, expense: 0 });
  }
  const findIdx = (y: number, m: number) => points.findIndex((p) => p.year === y && p.month === m);
  for (const t of txs) {
    const i = findIdx(t.date.getFullYear(), t.date.getMonth() + 1);
    if (i < 0) continue;
    if (t.type === "INCOME") points[i].income += t.amount;
    else points[i].expense += t.amount;
  }
  return points;
}

export type CategoryDelta = {
  name: string;
  color: string;
  current: number;
  previous: number;
  pct: number; // signed % change vs previous month
};

// Biggest category spending changes: this month vs previous month (top movers).
export async function getCategoryDeltas(
  userId: string,
  year: number,
  month: number,
  top = 5,
): Promise<CategoryDelta[]> {
  const cur = monthRange(year, month);
  const prevAnchor = new Date(year, month - 2, 1);
  const prev = monthRange(prevAnchor.getFullYear(), prevAnchor.getMonth() + 1);

  const [curGroup, prevGroup, cats] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", date: { gte: cur.start, lte: cur.end } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", date: { gte: prev.start, lte: prev.end } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true, color: true } }),
  ]);

  const curMap = new Map(curGroup.map((r) => [r.categoryId, r._sum.amount ?? 0]));
  const prevMap = new Map(prevGroup.map((r) => [r.categoryId, r._sum.amount ?? 0]));

  const deltas: CategoryDelta[] = cats
    .map((c) => {
      const current = curMap.get(c.id) ?? 0;
      const previous = prevMap.get(c.id) ?? 0;
      let pct: number;
      if (previous === 0) pct = current > 0 ? 100 : 0;
      else pct = ((current - previous) / previous) * 100;
      return { name: c.name, color: c.color, current, previous, pct };
    })
    .filter((d) => d.current > 0 || d.previous > 0)
    .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous))
    .slice(0, top);

  return deltas;
}
