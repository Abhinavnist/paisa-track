import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { recurringSchema } from "@/lib/validation";

// GET /api/recurring
export async function GET() {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const rules = await prisma.recurringRule.findMany({
    where: { userId: authResult.userId },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { id: true, name: true, color: true, icon: true } } },
  });
  return NextResponse.json({ rules });
}

// POST /api/recurring
export async function POST(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;

  const body = await req.json().catch(() => null);
  const parsed = recurringSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  if (d.categoryId) {
    const owned = await prisma.category.findFirst({
      where: { id: d.categoryId, userId: authResult.userId },
      select: { id: true },
    });
    if (!owned) return badRequest("Category not found");
  }

  const rule = await prisma.recurringRule.create({
    data: {
      userId: authResult.userId,
      amount: d.amount,
      type: d.type,
      categoryId: d.type === "EXPENSE" ? d.categoryId ?? null : null,
      note: d.note ?? null,
      frequency: d.frequency,
      dayOfMonth: d.dayOfMonth ?? 1,
      weekday: d.weekday ?? 1,
      active: d.active ?? true,
    },
    include: { category: { select: { id: true, name: true, color: true, icon: true } } },
  });
  return NextResponse.json({ rule }, { status: 201 });
}
