import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, badRequest } from "@/lib/api";
import { updateRecurringSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/recurring/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: authResult.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateRecurringSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  if (parsed.data.categoryId) {
    const owned = await prisma.category.findFirst({
      where: { id: parsed.data.categoryId, userId: authResult.userId },
      select: { id: true },
    });
    if (!owned) return badRequest("Category not found");
  }

  const rule = await prisma.recurringRule.update({
    where: { id },
    data: parsed.data,
    include: { category: { select: { id: true, name: true, color: true, icon: true } } },
  });
  return NextResponse.json({ rule });
}

// DELETE /api/recurring/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await requireApiUser();
  if ("response" in authResult) return authResult.response;
  const { id } = await params;

  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: authResult.userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recurringRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
