import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { updateTransactionSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/transactions/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: authResult.userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
  const data = parsed.data;

  if (data.categoryId) {
    const owned = await prisma.category.findFirst({
      where: { id: data.categoryId, userId: authResult.userId },
      select: { id: true },
    });
    if (!owned) return badRequest("Category not found");
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      amount: data.amount,
      type: data.type,
      categoryId: data.categoryId,
      date: data.date,
      note: data.note,
    },
    include: { category: { select: { id: true, name: true, color: true, icon: true } } },
  });

  return NextResponse.json({ transaction });
}

// DELETE /api/transactions/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: authResult.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
