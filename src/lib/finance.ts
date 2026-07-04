import { startOfMonth, endOfMonth } from "date-fns";
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
      select: { id: true, name: true, color: true },
    }),
  ]);

  const income = totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0;
  const expense = totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0;
  const catMap = new Map(categories.map((c) => [c.id, c]));

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
