import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { transactionSchema } from "@/lib/validation";
import { monthRange } from "@/lib/finance";
import type { Prisma } from "@/generated/prisma";

// GET /api/transactions?year=&month=&type=&categoryId=&limit=
export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const sp = req.nextUrl.searchParams;
  const where: Prisma.TransactionWhereInput = { userId: authResult.userId };

  const year = Number(sp.get("year"));
  const month = Number(sp.get("month"));
  if (year && month) {
    const { start, end } = monthRange(year, month);
    where.date = { gte: start, lte: end };
  }

  const type = sp.get("type");
  if (type === "INCOME" || type === "EXPENSE") where.type = type;

  const categoryId = sp.get("categoryId");
  if (categoryId) where.categoryId = categoryId;

  const limit = Math.min(Number(sp.get("limit")) || 100, 500);

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { category: { select: { id: true, name: true, color: true, icon: true } } },
  });

  return NextResponse.json({ transactions });
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const body = await req.json().catch(() => null);
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const { amount, type, categoryId, date, note } = parsed.data;

  // If a category is given, ensure it belongs to this user.
  if (categoryId) {
    const owned = await prisma.category.findFirst({
      where: { id: categoryId, userId: authResult.userId },
      select: { id: true },
    });
    if (!owned) return badRequest("Category not found");
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: authResult.userId,
      amount,
      type,
      categoryId: type === "EXPENSE" ? categoryId ?? null : null,
      date: date ?? new Date(),
      note: note ?? null,
      source: "MANUAL",
    },
    include: { category: { select: { id: true, name: true, color: true, icon: true } } },
  });

  return NextResponse.json({ transaction }, { status: 201 });
}
